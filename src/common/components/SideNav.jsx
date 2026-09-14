import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge, IconButton, Tooltip, Typography } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import { sessionActions } from "../../store";
import { nativePostMessage } from "./NativeInterface";
import { useTranslation } from "./LocalizationProvider";
import logo from "../../resources/images/logo-vigilateh.png";
import useCurrentRole from "../auth/useCurrentRole";

export const navigationItems = [
  { value: "map", href: "/", label: "mapTitle", icon: MapOutlinedIcon },
  {
    value: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
    icon: DashboardOutlinedIcon,
  },
  {
    value: "settings",
    href: "/settings/preferences",
    label: "settingsTitle",
    icon: TuneOutlinedIcon,
  },
  {
    value: "events",
    href: "/reports/events",
    label: "reportEvents",
    icon: NotificationsNoneOutlinedIcon,
  },
  {
    value: "commands",
    href: "/commands",
    label: "navigationCommands",
    icon: SendOutlinedIcon,
  },
  {
    value: "reports",
    href: "/reports/combined",
    label: "reportTitle",
    icon: AssessmentOutlinedIcon,
  },
  {
    value: "billing",
    href: "/billing",
    label: "navigationBilling",
    icon: AccountBalanceWalletOutlinedIcon,
  },
  {
    value: "language",
    href: "/language",
    label: "navigationLanguage",
    icon: LanguageOutlinedIcon,
  },
];

export const logout = async (user, dispatch, navigate) => {
  const notificationToken = window.localStorage.getItem("notificationToken");
  if (notificationToken && !user.readonly) {
    window.localStorage.removeItem("notificationToken");
    const tokens = user.attributes.notificationTokens?.split(",") || [];
    if (tokens.includes(notificationToken)) {
      const updatedUser = {
        ...user,
        attributes: {
          ...user.attributes,
          notificationTokens:
            tokens.length > 1
              ? tokens.filter((it) => it !== notificationToken).join(",")
              : undefined,
        },
      };
      await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedUser),
      });
    }
  }
  await fetch("/api/session", { method: "DELETE" });
  nativePostMessage("logout");
  navigate("/login");
  dispatch(sessionActions.updateUser(null));
};

const useStyles = makeStyles()((theme) => ({
  root: {
    position: "fixed",
    inset: "0 auto 0 0",
    zIndex: 10,
    width: theme.dimensions.sideNavWidth,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#30343A",
    color: "#FFFFFF",
    boxShadow: "2px 0 8px rgba(15, 23, 42, 0.16)",
  },
  logoWrap: {
    width: "100%",
    height: 66,
    display: "grid",
    placeItems: "center",
    borderBottom: "1px solid rgba(255,255,255,.1)",
  },
  logo: { width: 42, height: 42, objectFit: "contain" },
  items: { width: "100%", flex: 1, paddingTop: theme.spacing(0.5) },
  item: {
    width: "100%",
    minHeight: 62,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 2,
    borderRadius: 0,
    color: "rgba(255,255,255,.78)",
    "&:hover": { color: "#FFFFFF", backgroundColor: "rgba(255,255,255,.08)" },
  },
  active: { color: "#FFFFFF", backgroundColor: "#0A76C4" },
  label: { fontSize: 9.5, lineHeight: 1.1 },
  logout: { borderTop: "1px solid rgba(255,255,255,.1)" },
}));

const SideNav = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.session.user);
  const socket = useSelector((state) => state.session.socket);
  const { can } = useCurrentRole();
  const selected = (item) =>
    item.href === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(item.href);

  return (
    <nav className={classes.root} aria-label={t("sharedMenu")}>
      <div className={classes.logoWrap}>
        <img className={classes.logo} src={logo} alt="VigilaTeh" />
      </div>
      <div className={classes.items}>
        {navigationItems
          .filter((item) => can(item.value))
          .map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.value} title={t(item.label)} placement="right">
                <IconButton
                  className={`${classes.item} ${selected(item) ? classes.active : ""}`}
                  onClick={() => navigate(item.href)}
                >
                  {item.value === "map" ? (
                    <Badge
                      color="error"
                      variant="dot"
                      invisible={socket !== false}
                    >
                      <Icon fontSize="small" />
                    </Badge>
                  ) : (
                    <Icon fontSize="small" />
                  )}
                  <Typography component="span" className={classes.label}>
                    {t(item.label)}
                  </Typography>
                </IconButton>
              </Tooltip>
            );
          })}
      </div>
      <Tooltip title={t("loginLogout")} placement="right">
        <IconButton
          className={`${classes.item} ${classes.logout}`}
          onClick={() => logout(user, dispatch, navigate)}
        >
          <LogoutOutlinedIcon fontSize="small" />
          <Typography component="span" className={classes.label}>
            {t("loginLogout")}
          </Typography>
        </IconButton>
      </Tooltip>
    </nav>
  );
};

export default SideNav;
