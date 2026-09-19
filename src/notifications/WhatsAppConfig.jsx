/**
 * IMPORTANTE: Esta página solo guarda preferencias en user.attributes.
 * El envío real de WhatsApp depende de:
 *   1. Notificador "web" activo en traccar.xml del servidor (ya configurado).
 *   2. notificator.web.url apuntando a n8n (pendiente).
 *   3. n8n llamando a Evolution API para enviar el mensaje (pendiente).
 * Sin esos tres pasos, los mensajes NO se envían.
 */
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { useTranslation } from "../common/components/LocalizationProvider";
import fetchOrThrow from "../common/util/fetchOrThrow";
import { sessionActions } from "../store";

const eventTypes = [
  "ignitionOn",
  "ignitionOff",
  "engineCutSent",
  "engineCutRestored",
  "deviceOnline",
  "deviceOffline",
  "deviceUnknown",
];

const timerDuration = 4 * 60 * 60 * 1000;

const parseNumberArray = (value) => {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map(Number).filter(Number.isFinite)
        : [];
    } catch {
      return [];
    }
  }
  return [];
};

const parseStringArray = (value) => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const formatDuration = (milliseconds) => {
  const minutes = Math.max(0, Math.ceil(milliseconds / 60000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
};

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const WhatsAppConfig = () => {
  const t = useTranslation();
  const dispatch = useDispatch();
  const sessionUser = useSelector((state) => state.session.user);
  const [user, setUser] = useState(sessionUser);
  const [enabled, setEnabled] = useState(
    Boolean(sessionUser?.attributes?.whatsappEnabled),
  );
  const [phone, setPhone] = useState(sessionUser?.phone || "");
  const [events, setEvents] = useState(() =>
    parseStringArray(sessionUser?.attributes?.whatsappEvents),
  );
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState(() =>
    parseNumberArray(sessionUser?.attributes?.whatsappDevices),
  );
  const [activatedAt, setActivatedAt] = useState(
    sessionUser?.attributes?.whatsappActivatedAt || null,
  );
  const [expiresAt, setExpiresAt] = useState(
    sessionUser?.attributes?.whatsappExpiresAt || null,
  );
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState();

  const putUser = useCallback(
    async (updatedUser) => {
      const response = await fetchOrThrow(`/api/users/${updatedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedUser),
      });
      const savedUser = await response.json();
      setUser(savedUser);
      dispatch(sessionActions.updateUser(savedUser));
      return savedUser;
    },
    [dispatch],
  );

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const [userResponse, devicesResponse] = await Promise.all([
          fetchOrThrow(`/api/users/${sessionUser.id}`, {
            signal: controller.signal,
          }),
          fetchOrThrow("/api/devices", { signal: controller.signal }),
        ]);
        let loadedUser = await userResponse.json();
        const loadedDevices = await devicesResponse.json();
        const attributes = { ...loadedUser.attributes };
        const loadedDeviceIds = Object.hasOwn(attributes, "whatsappDevices")
          ? parseNumberArray(attributes.whatsappDevices)
          : loadedDevices.map((device) => device.id);
        let loadedEnabled = Boolean(attributes.whatsappEnabled);
        let loadedActivatedAt = attributes.whatsappActivatedAt || null;
        let loadedExpiresAt = attributes.whatsappExpiresAt || null;
        let shouldPersistTimer = false;
        let expired = false;
        const currentTime = Date.now();

        if (loadedEnabled && loadedExpiresAt) {
          if (new Date(loadedExpiresAt).getTime() <= currentTime) {
            loadedEnabled = false;
            loadedActivatedAt = null;
            loadedExpiresAt = null;
            shouldPersistTimer = true;
            expired = true;
          }
        } else if (loadedEnabled) {
          loadedActivatedAt = new Date(currentTime).toISOString();
          loadedExpiresAt = new Date(currentTime + timerDuration).toISOString();
          shouldPersistTimer = true;
        }

        if (shouldPersistTimer) {
          loadedUser = await putUser({
            ...loadedUser,
            attributes: {
              ...attributes,
              whatsappEnabled: loadedEnabled,
              whatsappDevices: loadedDeviceIds,
              whatsappActivatedAt: loadedActivatedAt,
              whatsappExpiresAt: loadedExpiresAt,
            },
          });
          if (expired) {
            setFeedback({
              severity: "warning",
              message: t("whatsappTimerExpired"),
            });
          }
        } else {
          setUser(loadedUser);
        }
        setDevices(loadedDevices);
        setSelectedDevices(loadedDeviceIds);
        setEnabled(loadedEnabled);
        setActivatedAt(loadedActivatedAt);
        setExpiresAt(loadedExpiresAt);
        setPhone(loadedUser.phone || "");
        setEvents(parseStringArray(loadedUser.attributes?.whatsappEvents));
        setNow(currentTime);
      } catch (error) {
        if (error.name !== "AbortError")
          setFeedback({
            severity: "error",
            message: t("whatsappTrackingLoadError"),
          });
      } finally {
        setLoading(false);
      }
    };
    if (sessionUser?.id) load();
    return () => controller.abort();
  }, [putUser, sessionUser?.id, t]);

  const buildUpdatedUser = useCallback(
    (overrides = {}) => ({
      ...user,
      phone,
      attributes: {
        ...user.attributes,
        whatsappEnabled: enabled,
        whatsappEvents: events,
        whatsappDevices: selectedDevices,
        whatsappActivatedAt: activatedAt,
        whatsappExpiresAt: expiresAt,
        ...overrides,
      },
    }),
    [activatedAt, enabled, events, expiresAt, phone, selectedDevices, user],
  );

  const expireTracking = useCallback(async () => {
    if (!user || !enabled) return;
    setEnabled(false);
    setActivatedAt(null);
    setExpiresAt(null);
    try {
      await putUser(
        buildUpdatedUser({
          whatsappEnabled: false,
          whatsappActivatedAt: null,
          whatsappExpiresAt: null,
        }),
      );
      setFeedback({
        severity: "warning",
        message: t("whatsappTimerExpired"),
      });
    } catch {
      setFeedback({
        severity: "error",
        message: t("whatsappTrackingSaveError"),
      });
    }
  }, [buildUpdatedUser, enabled, putUser, t, user]);

  useEffect(() => {
    if (!enabled || !expiresAt) return undefined;
    const interval = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (new Date(expiresAt).getTime() <= currentTime) {
        expireTracking();
      }
    }, 60000);
    return () => window.clearInterval(interval);
  }, [enabled, expiresAt, expireTracking]);

  const toggleEvent = (type) => {
    setEvents((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    );
  };

  const toggleDevice = (deviceId) => {
    setSelectedDevices((current) =>
      current.includes(deviceId)
        ? current.filter((id) => id !== deviceId)
        : [...current, deviceId],
    );
  };

  const toggleEnabled = (nextEnabled) => {
    setEnabled(nextEnabled);
    if (nextEnabled) {
      const currentTime = Date.now();
      setActivatedAt(new Date(currentTime).toISOString());
      setExpiresAt(new Date(currentTime + timerDuration).toISOString());
      setNow(currentTime);
    } else {
      setActivatedAt(null);
      setExpiresAt(null);
    }
  };

  const save = async () => {
    if (enabled && selectedDevices.length === 0) {
      setFeedback({
        severity: "error",
        message: t("whatsappDevicesRequired"),
      });
      return;
    }
    setSaving(true);
    try {
      await putUser(buildUpdatedUser());
      setFeedback({
        severity: "success",
        message: t("whatsappTrackingSaveSuccess"),
      });
    } catch {
      setFeedback({
        severity: "error",
        message: t("whatsappTrackingSaveError"),
      });
    } finally {
      setSaving(false);
    }
  };

  const extendTimer = async () => {
    setSaving(true);
    try {
      const currentTime = Date.now();
      const currentExpiration = new Date(expiresAt).getTime();
      const nextExpiration = new Date(
        Math.max(currentExpiration, currentTime) + timerDuration,
      ).toISOString();
      setExpiresAt(nextExpiration);
      setNow(currentTime);
      await putUser(buildUpdatedUser({ whatsappExpiresAt: nextExpiration }));
      setFeedback({
        severity: "success",
        message: t("whatsappTrackingSaveSuccess"),
      });
    } catch {
      setFeedback({
        severity: "error",
        message: t("whatsappTrackingSaveError"),
      });
    } finally {
      setSaving(false);
    }
  };

  const remaining = expiresAt ? new Date(expiresAt).getTime() - now : 0;
  const timerSeverity =
    remaining < 10 * 60000
      ? "error"
      : remaining < 30 * 60000
        ? "warning"
        : "info";
  const timerText = expiresAt
    ? t("whatsappTimerActive")
        .replace("{time}", formatTime(expiresAt))
        .replace("{duration}", formatDuration(remaining))
    : "";

  return (
    <Container sx={{ py: 4, maxWidth: 720 }}>
      <Card variant="outlined">
        <CardContent sx={{ display: "grid", gap: 2 }}>
          <Typography variant="h5">{t("whatsappTrackingTitle")}</Typography>
          {loading ? (
            <CircularProgress />
          ) : (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={enabled}
                    onChange={(event) => toggleEnabled(event.target.checked)}
                  />
                }
                label={t("whatsappTrackingEnable")}
              />
              <Alert severity="info">{t("whatsappTimerInfo")}</Alert>
              {enabled && expiresAt && (
                <Alert severity={timerSeverity} icon={<AccessTimeIcon />}>
                  <Typography>{timerText}</Typography>
                  {timerSeverity === "warning" && (
                    <Typography variant="caption">
                      {t("whatsappTimerWarning")}
                    </Typography>
                  )}
                  {timerSeverity === "error" && (
                    <Typography variant="caption">
                      {t("whatsappTimerCritical")}
                    </Typography>
                  )}
                  <Box sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={saving || sessionUser.readonly}
                      onClick={extendTimer}
                    >
                      {t("whatsappTimerExtend")}
                    </Button>
                  </Box>
                </Alert>
              )}
              <TextField
                type="tel"
                label={t("whatsappTrackingNumber")}
                placeholder="+52..."
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              <Box sx={{ opacity: enabled ? 1 : 0.5 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {t("whatsappDevicesTitle")}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                  <Button
                    size="small"
                    disabled={!enabled}
                    onClick={() =>
                      setSelectedDevices(devices.map((device) => device.id))
                    }
                  >
                    {t("whatsappSelectAll")}
                  </Button>
                  <Button
                    size="small"
                    disabled={!enabled}
                    onClick={() => setSelectedDevices([])}
                  >
                    {t("whatsappDeselectAll")}
                  </Button>
                </Box>
                <FormGroup>
                  {devices.map((device) => (
                    <FormControlLabel
                      key={device.id}
                      disabled={!enabled}
                      control={
                        <Checkbox
                          checked={selectedDevices.includes(device.id)}
                          onChange={() => toggleDevice(device.id)}
                        />
                      }
                      label={device.name}
                    />
                  ))}
                </FormGroup>
              </Box>
              {enabled && (
                <>
                  <FormGroup>
                    {eventTypes.map((type) => (
                      <FormControlLabel
                        key={type}
                        control={
                          <Checkbox
                            checked={events.includes(type)}
                            onChange={() => toggleEvent(type)}
                          />
                        }
                        label={t(
                          `whatsappEvent${type.charAt(0).toUpperCase()}${type.slice(1)}`,
                        )}
                      />
                    ))}
                  </FormGroup>
                  <Alert severity="info">
                    {t("whatsappTrackingEngineNote")}
                  </Alert>
                </>
              )}
              <Button
                variant="contained"
                disabled={saving || sessionUser.readonly}
                onClick={save}
              >
                {saving ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  t("sharedSave")
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
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

export default WhatsAppConfig;
