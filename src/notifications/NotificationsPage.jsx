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

const parseDeviceIds = (raw) => {
  if (Array.isArray(raw)) {
    return raw.map(Number).filter(Number.isFinite);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map(Number).filter(Number.isFinite)
        : [];
    } catch {
      return [];
    }
  }
  return [];
};

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
        const notificationsResponse = await fetchOrThrow("/api/notifications", {
          signal,
        });
        const allNotifications = await notificationsResponse.json();
        const own = allNotifications.filter(isOwnedNotification);
        const typeMap = notificationMap(own);
        const matrix = Object.fromEntries(
          deviceList.map((device) => [device.id, {}]),
        );
        let activeCount = 0;
        typeMap.forEach((notification) => {
          parseDeviceIds(notification.attributes?.deviceIds).forEach(
            (deviceId) => {
              if (matrix[deviceId] && eventTypes.includes(notification.type)) {
                matrix[deviceId][notification.type] = true;
                activeCount += 1;
              }
            },
          );
        });
        console.log(
          `[VigilaTeh] GET notifications → ${own.length} propias / ${allNotifications.length} totales`,
        );
        console.log(
          `[VigilaTeh] Matriz reconstruida desde attributes.deviceIds: ${deviceList.length} dispositivos, ${activeCount} eventos activos`,
        );
        setOwnedNotifications(own);
        setNotificationTotal(allNotifications.length);
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
                attributes: { vigilateh: "true", deviceIds: [deviceId] },
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
            const deviceIds = parseDeviceIds(
              notification.attributes?.deviceIds,
            );
            if (!deviceIds.includes(deviceId)) {
              const updatedDeviceIds = [...deviceIds, deviceId];
              notification = {
                ...notification,
                attributes: {
                  ...notification.attributes,
                  deviceIds: updatedDeviceIds,
                },
              };
              console.log(
                `[VigilaTeh] PUT notification id=${notification.id} deviceIds=${JSON.stringify(updatedDeviceIds)}`,
              );
              await fetchOrThrow(`/api/notifications/${notification.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(notification),
              });
              typeMap.set(type, notification);
            }
          }
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
          console.log(
            `[VigilaTeh] Permission creado deviceId=${deviceId} notificationId=${notification.id}`,
          );
        } else if (notification) {
          const deviceIds = parseDeviceIds(notification.attributes?.deviceIds);
          const updatedDeviceIds = deviceIds.filter((id) => id !== deviceId);
          if (updatedDeviceIds.length !== deviceIds.length) {
            notification = {
              ...notification,
              attributes: {
                ...notification.attributes,
                deviceIds: updatedDeviceIds,
              },
            };
            console.log(
              `[VigilaTeh] PUT notification id=${notification.id} deviceIds=${JSON.stringify(updatedDeviceIds)}`,
            );
            await fetchOrThrow(`/api/notifications/${notification.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(notification),
            });
            typeMap.set(type, notification);
          }
          const permission = { deviceId, notificationId: notification.id };
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

  const debugNotifications = ownedNotifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    deviceIds: parseDeviceIds(notification.attributes?.deviceIds),
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
            <pre>{JSON.stringify(debugNotifications, null, 2)}</pre>
            <pre>{JSON.stringify(selected, null, 2)}</pre>
            <Button onClick={() => loadData()}>
              {t("vehicleNotificationsRefresh")}
            </Button>
            <Button
              onClick={() =>
                setFeedback({
                  severity: "info",
                  message: `${t("vehicleNotificationsUserId")}: ${userId}`,
                })
              }
            >
              {t("vehicleNotificationsUserId")}
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
