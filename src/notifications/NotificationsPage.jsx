import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Container,
  FormControlLabel,
  FormGroup,
  Snackbar,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../common/components/LocalizationProvider";
import fetchOrThrow from "../common/util/fetchOrThrow";

const eventTypes = [
  "ignitionOn",
  "ignitionOff",
  "deviceOnline",
  "deviceOffline",
  "geofenceEnter",
  "geofenceExit",
  "alarm",
  "commandResult",
];

const isOwnedNotification = (notification) =>
  notification.attributes?.vigilateh === "true";

const notificationMap = (notifications) => {
  const result = new Map();
  [...notifications]
    .sort((first, second) => first.id - second.id)
    .forEach((notification) => {
      if (!result.has(notification.type)) {
        result.set(notification.type, notification);
      }
    });
  return result;
};

const errorMessage = (error) => {
  if (error?.status) {
    return `${error.status} — ${error.body || error.statusText}`;
  }
  return error?.message || String(error);
};

const NotificationsPage = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const devices = useSelector((state) => state.devices.items);
  const userId = useSelector((state) => state.session.user?.id);
  const deviceList = useMemo(() => Object.values(devices), [devices]);
  const [ownedNotifications, setOwnedNotifications] = useState([]);
  const [notificationTotal, setNotificationTotal] = useState(0);
  const [permissions, setPermissions] = useState([]);
  const [selected, setSelected] = useState({});
  const [persistedSelected, setPersistedSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState();
  const [feedback, setFeedback] = useState();
  const debugEnabled = window.localStorage.getItem("vigilatehDebug") === "1";

  const loadData = useCallback(
    async (signal) => {
      if (!userId) return;
      setLoading(true);
      try {
        const [notificationsResponse, permissionsResponse] = await Promise.all([
          fetchOrThrow("/api/notifications", { signal }),
          fetchOrThrow(`/api/permissions?userId=${userId}`, { signal }),
        ]);
        const allNotifications = await notificationsResponse.json();
        const own = allNotifications.filter(isOwnedNotification);
        const typeMap = notificationMap(own);
        const canonicalById = new Map(
          [...typeMap.values()].map((notification) => [
            notification.id,
            notification,
          ]),
        );
        const allPermissions = await permissionsResponse.json();
        const devicePermissions = allPermissions.filter(
          (permission) => permission.notificationId && permission.deviceId,
        );
        const matrix = Object.fromEntries(
          deviceList.map((device) => [device.id, {}]),
        );
        let activeCount = 0;
        devicePermissions.forEach((permission) => {
          const notification = canonicalById.get(permission.notificationId);
          if (
            matrix[permission.deviceId] &&
            eventTypes.includes(notification?.type)
          ) {
            matrix[permission.deviceId][notification.type] = true;
            activeCount += 1;
          }
        });
        console.log(
          `[VigilaTeh] GET notifications → ${own.length} propias / ${allNotifications.length} totales`,
        );
        console.log(
          `[VigilaTeh] GET permissions?userId=${userId} → ${devicePermissions.length} permisos`,
        );
        console.log(
          `[VigilaTeh] Matriz reconstruida: ${deviceList.length} dispositivos, ${activeCount} eventos activos`,
        );
        setOwnedNotifications(own);
        setNotificationTotal(allNotifications.length);
        setPermissions(devicePermissions);
        setSelected(matrix);
        setPersistedSelected(matrix);
      } catch (error) {
        if (error.name !== "AbortError") {
          setFeedback({
            severity: "error",
            message: `${t("vehicleNotificationsLoadError")}: ${errorMessage(error)}`,
          });
        }
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [deviceList, t, userId],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [loadData]);

  const toggle = (deviceId, type) => {
    setSelected((current) => ({
      ...current,
      [deviceId]: {
        ...current[deviceId],
        [type]: !current[deviceId]?.[type],
      },
    }));
  };

  const saveDevice = async (deviceId, force = false) => {
    setSavingId(deviceId);
    try {
      const typeMap = notificationMap(ownedNotifications);
      const knownPermissions = [...permissions];
      for (const type of eventTypes) {
        const enabled = Boolean(selected[deviceId]?.[type]);
        const existed = Boolean(persistedSelected[deviceId]?.[type]);
        if (!force && enabled === existed) continue;

        let notification = typeMap.get(type);
        if (enabled) {
          if (!notification) {
            console.log(`[VigilaTeh] Creando notification type=${type}`);
            const response = await fetchOrThrow("/api/notifications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type,
                always: false,
                notificators: "web",
                attributes: { vigilateh: "true" },
              }),
            });
            notification = await response.json();
            typeMap.set(type, notification);
            console.log(
              `[VigilaTeh] Notification creada id=${notification.id}`,
            );
          } else {
            console.log(
              `[VigilaTeh] Reutilizando notification id=${notification.id} type=${type}`,
            );
          }
          const exists = knownPermissions.some(
            (permission) =>
              permission.deviceId === deviceId &&
              permission.notificationId === notification.id,
          );
          if (!exists) {
            const permission = { deviceId, notificationId: notification.id };
            console.log(
              `[VigilaTeh] Creando permission deviceId=${deviceId} notificationId=${notification.id}`,
            );
            try {
              await fetchOrThrow("/api/permissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(permission),
              });
            } catch (error) {
              if (![400, 409].includes(error.status)) throw error;
            }
            knownPermissions.push(permission);
            console.log("[VigilaTeh] Permission creado");
          }
        } else if (notification) {
          const permissionIndex = knownPermissions.findIndex(
            (permission) =>
              permission.deviceId === deviceId &&
              permission.notificationId === notification.id,
          );
          if (permissionIndex >= 0) {
            const permission = knownPermissions[permissionIndex];
            console.log(
              `[VigilaTeh] DELETE permission deviceId=${deviceId} notificationId=${notification.id}`,
            );
            try {
              await fetchOrThrow("/api/permissions", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(permission),
              });
            } catch (error) {
              if (error.status !== 404) throw error;
            }
            knownPermissions.splice(permissionIndex, 1);
          }
        }
      }
      await loadData();
      setFeedback({
        severity: "success",
        message: t("vehicleNotificationsSaveSuccess"),
      });
    } catch (error) {
      setFeedback({
        severity: "error",
        message: `${t("vehicleNotificationsSaveError")}: ${errorMessage(error)}`,
      });
    } finally {
      setSavingId(undefined);
    }
  };

  const debugPermissions = permissions.map((permission) => ({
    deviceId: permission.deviceId,
    notificationId: permission.notificationId,
    type: ownedNotifications.find(
      (notification) => notification.id === permission.notificationId,
    )?.type,
  }));

  return (
    <Container sx={{ py: 4, maxWidth: 900 }}>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", gap: 2, mb: 3 }}
      >
        <Typography variant="h5">{t("vehicleNotificationsTitle")}</Typography>
        <Button onClick={() => navigate("/notifications/whatsapp")}>
          {t("whatsappTrackingTitle")}
        </Button>
      </Box>
      {loading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : deviceList.length === 0 ? (
        <Alert severity="info">{t("vehicleNotificationsEmpty")}</Alert>
      ) : (
        <Box sx={{ display: "grid", gap: 2 }}>
          {deviceList.map((device) => (
            <Card key={device.id} variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {device.name}
                </Typography>
                <FormGroup
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  }}
                >
                  {eventTypes.map((type) => (
                    <FormControlLabel
                      key={type}
                      control={
                        <Checkbox
                          checked={Boolean(selected[device.id]?.[type])}
                          onChange={() => toggle(device.id, type)}
                        />
                      }
                      label={t(
                        `event${type.charAt(0).toUpperCase()}${type.slice(1)}`,
                      )}
                    />
                  ))}
                </FormGroup>
                <Button
                  variant="contained"
                  sx={{ mt: 2 }}
                  disabled={savingId === device.id}
                  onClick={() => saveDevice(device.id)}
                >
                  {savingId === device.id ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    t("vehicleNotificationsSave")
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      {debugEnabled && (
        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>{t("vehicleNotificationsDebug")}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ display: "grid", gap: 2 }}>
            <Typography>
              {ownedNotifications.length} / {notificationTotal}
            </Typography>
            <pre>{JSON.stringify(ownedNotifications, null, 2)}</pre>
            <pre>{JSON.stringify(debugPermissions, null, 2)}</pre>
            <Button onClick={() => loadData()}>
              {t("vehicleNotificationsRefresh")}
            </Button>
            {deviceList.map((device) => (
              <Button
                key={device.id}
                onClick={() => saveDevice(device.id, true)}
              >
                {t("vehicleNotificationsForceSave")} {device.name}
              </Button>
            ))}
          </AccordionDetails>
        </Accordion>
      )}
      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={6000}
        onClose={() => setFeedback(undefined)}
      >
        {feedback ? (
          <Alert
            severity={feedback.severity}
            onClose={() => setFeedback(undefined)}
          >
            {feedback.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Container>
  );
};

export default NotificationsPage;
