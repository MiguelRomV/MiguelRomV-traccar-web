import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { IconButton, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { makeStyles } from "tss-react/mui";
import { devicesActions } from "../store";
import { useAsyncTask } from "../reactHelper";
import { useTranslation } from "../common/components/LocalizationProvider";
import { useDeviceReadonly } from "../common/util/permissions";
import DeviceRow from "./DeviceRow";
import fetchOrThrow from "../common/util/fetchOrThrow";

const useStyles = makeStyles()((theme) => ({
  root: {
    height: "100%",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  scroll: { flex: 1, minHeight: 0, overflowY: "auto" },
  groupHeader: {
    width: "100%",
    minHeight: 38,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.75, 1.25),
    border: 0,
    color: theme.palette.text.secondary,
    backgroundColor: "#F5F6F8",
    cursor: "pointer",
    textAlign: "left",
  },
  groupName: { flex: 1, fontSize: 12, fontWeight: 600 },
  footer: {
    minHeight: 52,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  add: {
    color: theme.palette.common.white,
    backgroundColor: theme.palette.primary.main,
  },
  empty: {
    padding: theme.spacing(4, 2),
    color: theme.palette.text.secondary,
    textAlign: "center",
  },
  visibilityBar: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    padding: theme.spacing(0.75, 1.25),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  visibilityLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: 600,
    color: theme.palette.text.secondary,
  },
  visibilityBtn: {
    fontSize: 10.5,
    padding: theme.spacing(0.35, 0.75),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 6,
    background: "transparent",
    cursor: "pointer",
    color: theme.palette.text.primary,
  },
}));

const DeviceList = ({
  devices,
  hiddenDeviceIds = [],
  setHiddenDeviceIds,
}) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();
  const deviceReadonly = useDeviceReadonly();
  const groups = useSelector((state) => state.groups.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const [collapsed, setCollapsed] = useState({});

  useAsyncTask(
    async ({ signal }) => {
      const response = await fetchOrThrow("/api/devices", { signal });
      dispatch(devicesActions.refresh(await response.json()));
    },
    [dispatch],
  );

  const grouped = useMemo(() => {
    const result = new Map();
    devices.forEach((device) => {
      const groupId = device.groupId || 0;
      if (!result.has(groupId)) result.set(groupId, []);
      result.get(groupId).push(device);
    });
    return [...result.entries()].sort(([firstId], [secondId]) => {
      if (firstId === 0) return -1;
      if (secondId === 0) return 1;
      return (groups[firstId]?.name || "").localeCompare(
        groups[secondId]?.name || "",
      );
    });
  }, [devices, groups]);

  return (
    <div className={classes.root}>
      <div className={classes.scroll}>
        {setHiddenDeviceIds && (
          <div className={classes.visibilityBar}>
            <span className={classes.visibilityLabel}>
              {hiddenDeviceIds.length === 0
                ? `Mostrando ${devices.length} unidades`
                : `${hiddenDeviceIds.length} ocultas de ${devices.length}`}
            </span>
            <button
              type="button"
              className={classes.visibilityBtn}
              onClick={() => setHiddenDeviceIds([])}
            >
              Mostrar todas
            </button>
            <button
              type="button"
              className={classes.visibilityBtn}
              onClick={() =>
                setHiddenDeviceIds(devices.map((device) => device.id))
              }
            >
              Ocultar todas
            </button>
          </div>
        )}
        {grouped.length ? (
          grouped.map(([groupId, groupDevices]) => {
            const isCollapsed = collapsed[groupId];
            const name = groupId
              ? groups[groupId]?.name || t("deviceNoGroup")
              : t("deviceNoGroup");
            return (
              <section key={groupId}>
                <button
                  type="button"
                  className={classes.groupHeader}
                  onClick={() =>
                    setCollapsed((current) => ({
                      ...current,
                      [groupId]: !isCollapsed,
                    }))
                  }
                >
                  {isCollapsed ? (
                    <ChevronRightIcon fontSize="small" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                  <Typography component="span" className={classes.groupName}>
                    {name} ({groupDevices.length})
                  </Typography>
                </button>
                {!isCollapsed &&
                  groupDevices.map((device) => (
                    <DeviceRow
                      key={device.id}
                      device={device}
                      hidden={hiddenDeviceIds.includes(device.id)}
                      onToggleHidden={
                        setHiddenDeviceIds
                          ? () =>
                              setHiddenDeviceIds((current) =>
                                current.includes(device.id)
                                  ? current.filter((id) => id !== device.id)
                                  : [...current, device.id],
                              )
                          : undefined
                      }
                    />
                  ))}
              </section>
            );
          })
        ) : (
          <div className={classes.empty}>{t("sharedNoData")}</div>
        )}
      </div>
      <div className={classes.footer}>
        <IconButton
          className={classes.add}
          onClick={() => navigate("/settings/device")}
          disabled={deviceReadonly}
        >
          <AddIcon />
        </IconButton>
        <IconButton
          onClick={() =>
            selectedDeviceId &&
            navigate(`/settings/device/${selectedDeviceId}/share`)
          }
          disabled={!selectedDeviceId}
        >
          <ShareOutlinedIcon />
        </IconButton>
        <IconButton onClick={() => navigate("/settings/preferences")}>
          <SettingsOutlinedIcon />
        </IconButton>
      </div>
    </div>
  );
};

export default DeviceList;
