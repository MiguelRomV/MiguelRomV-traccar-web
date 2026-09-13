import { IconButton, Paper, Tooltip } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import FullscreenOutlinedIcon from "@mui/icons-material/FullscreenOutlined";
import PolylineOutlinedIcon from "@mui/icons-material/PolylineOutlined";
import RouteOutlinedIcon from "@mui/icons-material/RouteOutlined";
import LabelOutlinedIcon from "@mui/icons-material/LabelOutlined";
import TrafficOutlinedIcon from "@mui/icons-material/TrafficOutlined";
import { useTranslation } from "../../common/components/LocalizationProvider";
import { map } from "../core/MapView";

const useStyles = makeStyles()((theme) => ({
  root: {
    position: "fixed",
    top: theme.spacing(11),
    right: theme.spacing(1.25),
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  button: { borderRadius: 0, color: "#4B5563" },
  active: { color: theme.palette.primary.main, backgroundColor: "#E6F0FA" },
}));

const MapActionToolbar = ({
  routesVisible,
  setRoutesVisible,
  labelsVisible,
  setLabelsVisible,
  geofenceActive,
  setGeofenceActive,
  trafficAvailable,
  trafficVisible,
  setTrafficVisible,
}) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const fullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      map.getContainer().requestFullscreen();
    }
  };

  const items = [
    {
      title: t("sharedPrint"),
      Icon: PrintOutlinedIcon,
      action: () => window.print(),
    },
    {
      title: t("mapFullscreen"),
      Icon: FullscreenOutlinedIcon,
      action: fullscreen,
    },
    {
      title: t("sharedGeofence"),
      Icon: PolylineOutlinedIcon,
      action: () => setGeofenceActive((value) => !value),
      active: geofenceActive,
    },
    {
      title: t(
        trafficAvailable ? "mapGoogleTraffic" : "mapGoogleTrafficUnavailable",
      ),
      Icon: TrafficOutlinedIcon,
      action: () => setTrafficVisible((value) => !value),
      active: trafficVisible,
      disabled: !trafficAvailable,
    },
    {
      title: t("mapLiveRoutes"),
      Icon: RouteOutlinedIcon,
      action: () => setRoutesVisible((value) => !value),
      active: routesVisible,
    },
    {
      title: t("mapDeviceLabels"),
      Icon: LabelOutlinedIcon,
      action: () => setLabelsVisible((value) => !value),
      active: labelsVisible,
    },
  ];

  return (
    <Paper className={classes.root} elevation={3}>
      {items.map(({ title, Icon, action, active, disabled }, index) => (
        <Tooltip key={title} title={title} placement="left">
          <IconButton
            className={`${classes.button} ${active ? classes.active : ""}`}
            onClick={action}
            disabled={disabled}
          >
            <Icon />
          </IconButton>
        </Tooltip>
      ))}
    </Paper>
  );
};

export default MapActionToolbar;
