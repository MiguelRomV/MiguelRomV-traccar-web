/**
 * IMPORTANTE: Esta página solo guarda preferencias en user.attributes.
 * El envío real de WhatsApp depende de:
 *   1. Notificador "web" activo en traccar.xml del servidor (ya configurado).
 *   2. notificator.web.url apuntando a n8n (pendiente).
 *   3. n8n llamando a Evolution API para enviar el mensaje (pendiente).
 * Sin esos tres pasos, los mensajes NO se envían.
 */
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Alert,
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
import { useTranslation } from "../common/components/LocalizationProvider";
import fetchOrThrow from "../common/util/fetchOrThrow";
import { sessionActions } from "../store";

const eventTypes = [
  "ignitionOn",
  "ignitionOff",
  "engineCutSent",
  "engineCutRestored",
];

const WhatsAppConfig = () => {
  const t = useTranslation();
  const dispatch = useDispatch();
  const sessionUser = useSelector((state) => state.session.user);
  const [user, setUser] = useState(sessionUser);
  const [enabled, setEnabled] = useState(
    Boolean(sessionUser?.attributes?.whatsappEnabled),
  );
  const [phone, setPhone] = useState(sessionUser?.phone || "");
  const [events, setEvents] = useState(
    sessionUser?.attributes?.whatsappEvents || [],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState();

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetchOrThrow(`/api/users/${sessionUser.id}`, {
          signal: controller.signal,
        });
        const loadedUser = await response.json();
        setUser(loadedUser);
        setEnabled(Boolean(loadedUser.attributes?.whatsappEnabled));
        setPhone(loadedUser.phone || "");
        setEvents(loadedUser.attributes?.whatsappEvents || []);
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
  }, [sessionUser?.id, t]);

  const toggleEvent = (type) => {
    setEvents((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const updatedUser = {
        ...user,
        phone,
        attributes: {
          ...user.attributes,
          whatsappEnabled: enabled,
          whatsappEvents: events,
        },
      };
      const response = await fetchOrThrow(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedUser),
      });
      const savedUser = await response.json();
      setUser(savedUser);
      dispatch(sessionActions.updateUser(savedUser));
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
                    onChange={(event) => setEnabled(event.target.checked)}
                  />
                }
                label={t("whatsappTrackingEnable")}
              />
              <TextField
                type="tel"
                label={t("whatsappTrackingNumber")}
                placeholder="+52..."
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
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
