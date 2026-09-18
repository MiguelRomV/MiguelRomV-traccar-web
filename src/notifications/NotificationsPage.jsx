import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
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

const NotificationsPage = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const devices = useSelector((state) => state.devices.items);
  const deviceList = useMemo(() => Object.values(devices), [devices]);
  const [notifications, setNotifications] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState();
  const [feedback, setFeedback] = useState();

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const [notificationsResponse, permissionsResponse] = await Promise.all([
          fetchOrThrow("/api/notifications", { signal: controller.signal }),
          fetchOrThrow("/api/permissions", { signal: controller.signal }),
        ]);
        const loadedNotifications = await notificationsResponse.json();
        const loadedPermissions = (await permissionsResponse.json()).filter(
          (permission) => permission.notificationId,
        );
        const notificationsById = new Map(
          loadedNotifications.map((notification) => [
            notification.id,
            notification,
          ]),
        );
        const matrix = {};
        deviceList.forEach((device) => {
          matrix[device.id] = {};
        });
        loadedPermissions.forEach((permission) => {
          const notification = notificationsById.get(permission.notificationId);
          if (
            matrix[permission.deviceId] &&
            eventTypes.includes(notification?.type)
          ) {
            matrix[permission.deviceId][notification.type] = true;
          }
        });
        setNotifications(loadedNotifications);
        setPermissions(loadedPermissions);
        setSelected(matrix);
      } catch (error) {
        if (error.name !== "AbortError") {
          setFeedback({
            severity: "error",
            message: t("vehicleNotificationsLoadError"),
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [deviceList, t]);

  const toggle = (deviceId, type) => {
    setSelected((current) => ({
      ...current,
      [deviceId]: {
        ...current[deviceId],
        [type]: !current[deviceId]?.[type],
      },
    }));
  };

  const saveDevice = async (deviceId) => {
    setSavingId(deviceId);
    try {
      const nextNotifications = [...notifications];
      const nextPermissions = [...permissions];
      for (const type of eventTypes) {
        let notification = nextNotifications.find((item) => item.type === type);
        const enabled = Boolean(selected[deviceId]?.[type]);
        if (enabled && !notification) {
          const response = await fetchOrThrow("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type,
              always: true,
              notificators: "web",
              calendarId: 0,
              attributes: {},
            }),
          });
          notification = await response.json();
          nextNotifications.push(notification);
        }
        if (!notification) continue;
        const permissionIndex = nextPermissions.findIndex(
          (permission) =>
            permission.deviceId === deviceId &&
            permission.notificationId === notification.id,
        );
        if (enabled && permissionIndex < 0) {
          const permission = { deviceId, notificationId: notification.id };
          await fetchOrThrow("/api/permissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(permission),
          });
          nextPermissions.push(permission);
        } else if (!enabled && permissionIndex >= 0) {
          const permission = nextPermissions[permissionIndex];
          await fetchOrThrow("/api/permissions", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(permission),
          });
          nextPermissions.splice(permissionIndex, 1);
        }
      }
      setNotifications(nextNotifications);
      setPermissions(nextPermissions);
      setFeedback({
        severity: "success",
        message: t("vehicleNotificationsSaveSuccess"),
      });
    } catch {
      setFeedback({
        severity: "error",
        message: t("vehicleNotificationsSaveError"),
      });
    } finally {
      setSavingId(undefined);
    }
  };

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
      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4000}
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
