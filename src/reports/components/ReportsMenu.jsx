import { Divider, List } from "@mui/material";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PlaceIcon from "@mui/icons-material/Place";
import BarChartIcon from "@mui/icons-material/BarChart";
import RouteIcon from "@mui/icons-material/Route";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import NotesIcon from "@mui/icons-material/Notes";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import { useLocation } from "react-router-dom";
import { useTranslation } from "../../common/components/LocalizationProvider";
import {
  useAdministrator,
  useRestriction,
} from "../../common/util/permissions";
import MenuItem from "../../common/components/MenuItem";

const ReportsMenu = () => {
  const t = useTranslation();
  const location = useLocation();

  const admin = useAdministrator();
  const readonly = useRestriction("readonly");

  const buildLink = (path) => {
    const sourceParams = new URLSearchParams(location.search);
    const deviceIds = sourceParams.getAll("deviceId");
    const groupIds = sourceParams.getAll("groupId");
    if (!deviceIds.length && !groupIds.length) {
      return path;
    }
    const params = new URLSearchParams();
    if (
      path === "/reports/chart" ||
      path === "/reports/route" ||
      path === "/replay"
    ) {
      const [firstDeviceId] = deviceIds;
      if (firstDeviceId != null) {
        params.append("deviceId", firstDeviceId);
      }
    } else {
      deviceIds.forEach((deviceId) => params.append("deviceId", deviceId));
      groupIds.forEach((groupId) => params.append("groupId", groupId));
    }
    const search = params.toString();
    return search ? `${path}?${search}` : path;
  };

  return (
    <>
      <List>
        <MenuItem
          title={t("reportEvents")}
          link={buildLink("/reports/events")}
          icon={<NotificationsActiveIcon />}
          selected={location.pathname === "/reports/events"}
        />
        <MenuItem
          title={t("sharedGeofences")}
          link={buildLink("/reports/geofences")}
          icon={<PlaceIcon />}
          selected={location.pathname === "/reports/geofences"}
        />
        <MenuItem
          title={t("reportTrips")}
          link={buildLink("/reports/trips")}
          icon={<PlayCircleFilledIcon />}
          selected={location.pathname === "/reports/trips"}
        />
        <MenuItem
          title={t("reportReplay")}
          link={buildLink("/replay")}
          icon={<RouteIcon />}
        />
      </List>
      <Divider />
      <List>
        <MenuItem
          title={t("sharedLogs")}
          link="/reports/logs"
          icon={<NotesIcon />}
          selected={location.pathname === "/reports/logs"}
        />
        {!readonly && (
          <MenuItem
            title={t("reportScheduled")}
            link="/reports/scheduled"
            icon={<EventRepeatIcon />}
            selected={location.pathname === "/reports/scheduled"}
          />
        )}
        {admin && (
          <MenuItem
            title={t("statisticsTitle")}
            link="/reports/statistics"
            icon={<BarChartIcon />}
            selected={location.pathname === "/reports/statistics"}
          />
        )}
        {admin && (
          <MenuItem
            title={t("reportAudit")}
            link="/reports/audit"
            icon={<VerifiedUserIcon />}
            selected={location.pathname === "/reports/audit"}
          />
        )}
      </List>
    </>
  );
};

export default ReportsMenu;
