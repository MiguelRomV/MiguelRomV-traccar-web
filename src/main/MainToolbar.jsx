import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Popover,
  Select,
  Tab,
  Tabs,
  Tooltip,
} from "@mui/material";
import { makeStyles } from "tss-react/mui";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import HistoryIcon from "@mui/icons-material/History";
import SearchIcon from "@mui/icons-material/Search";
import MapIcon from "@mui/icons-material/Map";
import DnsIcon from "@mui/icons-material/Dns";
import AddIcon from "@mui/icons-material/Add";
import TuneIcon from "@mui/icons-material/Tune";
import { useTranslation } from "../common/components/LocalizationProvider";
import { useDeviceReadonly } from "../common/util/permissions";
import { speedFromKnots } from "../common/util/converter";

const useStyles = makeStyles()((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.palette.background.paper,
  },
  tabs: {
    minHeight: 48,
    "& .MuiTab-root": {
      minWidth: 0,
      minHeight: 48,
      flex: 1,
      padding: theme.spacing(0.75, 0.5),
      fontSize: 11,
    },
  },
  states: {
    display: "flex",
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.75, 1),
    overflowX: "auto",
    borderTop: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  stateButton: {
    flexShrink: 0,
    minWidth: 0,
    height: 30,
    padding: theme.spacing(0.25, 1),
    fontSize: 11,
    textTransform: "none",
  },
  selectedState: { backgroundColor: "#E6F0FA" },
  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    padding: theme.spacing(1),
  },
  input: { flex: 1 },
  add: {
    color: theme.palette.common.white,
    backgroundColor: theme.palette.primary.main,
  },
  filterPanel: {
    display: "flex",
    flexDirection: "column",
    padding: theme.spacing(2),
    gap: theme.spacing(2),
    width: theme.dimensions.drawerWidthTablet,
  },
}));

const MainToolbar = ({
  devicesOpen,
  setDevicesOpen,
  keyword,
  setKeyword,
  filter,
  setFilter,
  filterSort,
  setFilterSort,
  filterMap,
  setFilterMap,
}) => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const t = useTranslation();
  const deviceReadonly = useDeviceReadonly();
  const groups = useSelector((state) => state.groups.items);
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);
  const geofences = useSelector((state) => state.geofences.items);
  const inputRef = useRef();
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);

  const stateOf = (device) => {
    const position = positions[device.id];
    const updated = Date.parse(device.lastUpdate);
    if (device.status !== "online" || !updated || Date.now() - updated > 300000)
      return "noSignal";
    if (speedFromKnots(position?.speed || 0, "kmh") > 5) return "moving";
    return position?.attributes?.ignition ? "idle" : "stopped";
  };
  const deviceValues = Object.values(devices);
  const count = (state) =>
    state === "all"
      ? deviceValues.length
      : deviceValues.filter((device) => stateOf(device) === state).length;
  const stateOptions = [
    ["all", t("eventAll")],
    ["moving", t("eventDeviceMoving")],
    ["stopped", t("eventDeviceStopped")],
    ["idle", t("positionStateIdle")],
    ["noSignal", t("positionStateNoSignal")],
  ];

  return (
    <div className={classes.root}>
      <Tabs value={0} className={classes.tabs}>
        <Tab
          icon={<GpsFixedIcon fontSize="small" />}
          iconPosition="start"
          label="GPS"
          onClick={() => navigate("/")}
        />
        <Tab
          icon={<NotificationsNoneIcon fontSize="small" />}
          iconPosition="start"
          label={t("reportEvents")}
          onClick={() => navigate("/reports/events")}
        />
        <Tab
          icon={<PlaceOutlinedIcon fontSize="small" />}
          iconPosition="start"
          label={t("sharedGeofences")}
          onClick={() => navigate("/geofences")}
        />
        <Tab
          icon={<HistoryIcon fontSize="small" />}
          iconPosition="start"
          label={t("reportReplay")}
          onClick={() => navigate("/replay")}
        />
      </Tabs>
      <div className={classes.states}>
        {stateOptions.map(([key, label]) => {
          const value = key === "all" ? "" : key;
          return (
            <Button
              key={key}
              className={`${classes.stateButton} ${(filter.motion || "") === value ? classes.selectedState : ""}`}
              onClick={() => setFilter({ ...filter, motion: value })}
            >
              {label} {count(key)}
            </Button>
          );
        })}
      </div>
      <div className={classes.searchRow}>
        <IconButton size="small" onClick={() => setDevicesOpen(!devicesOpen)}>
          {devicesOpen ? <MapIcon /> : <DnsIcon />}
        </IconButton>
        <OutlinedInput
          ref={inputRef}
          className={classes.input}
          placeholder={t("sharedSearchDevices")}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          startAdornment={
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          }
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => setFilterAnchorEl(inputRef.current)}
              >
                <Badge
                  color="info"
                  variant="dot"
                  invisible={
                    !filter.statuses.length &&
                    !filter.groups.length &&
                    !filter.geofences.length
                  }
                >
                  <TuneIcon fontSize="small" />
                </Badge>
              </IconButton>
            </InputAdornment>
          }
          size="small"
        />
        <Tooltip title={t("sharedAdd")}>
          <span>
            <IconButton
              className={classes.add}
              size="small"
              onClick={() => navigate("/settings/device")}
              disabled={deviceReadonly}
            >
              <AddIcon />
            </IconButton>
          </span>
        </Tooltip>
      </div>
      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <div className={classes.filterPanel}>
          <FormControl>
            <InputLabel>{t("deviceStatus")}</InputLabel>
            <Select
              label={t("deviceStatus")}
              value={filter.statuses}
              onChange={(event) =>
                setFilter({ ...filter, statuses: event.target.value })
              }
              multiple
            >
              <MenuItem value="online">{t("deviceStatusOnline")}</MenuItem>
              <MenuItem value="offline">{t("deviceStatusOffline")}</MenuItem>
              <MenuItem value="unknown">{t("deviceStatusUnknown")}</MenuItem>
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>{t("settingsGroups")}</InputLabel>
            <Select
              label={t("settingsGroups")}
              value={filter.groups}
              onChange={(event) =>
                setFilter({ ...filter, groups: event.target.value })
              }
              multiple
            >
              {Object.values(groups)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>{t("sharedGeofences")}</InputLabel>
            <Select
              label={t("sharedGeofences")}
              value={filter.geofences}
              onChange={(event) =>
                setFilter({ ...filter, geofences: event.target.value })
              }
              multiple
            >
              {Object.values(geofences)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((geofence) => (
                  <MenuItem key={geofence.id} value={geofence.id}>
                    {geofence.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>{t("sharedSortBy")}</InputLabel>
            <Select
              label={t("sharedSortBy")}
              value={filterSort}
              onChange={(event) => setFilterSort(event.target.value)}
            >
              <MenuItem value="">{"\u00a0"}</MenuItem>
              <MenuItem value="name">{t("sharedName")}</MenuItem>
              <MenuItem value="lastUpdate">{t("deviceLastUpdate")}</MenuItem>
            </Select>
          </FormControl>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={filterMap}
                  onChange={(event) => setFilterMap(event.target.checked)}
                />
              }
              label={t("sharedFilterMap")}
            />
          </FormGroup>
        </div>
      </Popover>
    </div>
  );
};

export default MainToolbar;
