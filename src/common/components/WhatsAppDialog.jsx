import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { sendWhatsApp } from "../util/vigilatehWebhooks";
import fetchOrThrow from "../util/fetchOrThrow";
import { sessionActions } from "../../store";
import { useTranslation } from "./LocalizationProvider";

const WhatsAppDialog = ({ open, onClose, deviceId, deviceName }) => {
  const t = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.session.user);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState(
    `Información del vehículo ${deviceName || ""}`,
  );
  const [result, setResult] = useState(null);
  const send = async () =>
    setResult(await sendWhatsApp({ to, message, deviceId }));
  const disable = async () => {
    const updatedUser = {
      ...user,
      attributes: {
        ...user.attributes,
        whatsappEnabled: false,
        whatsappActivatedAt: null,
        whatsappExpiresAt: null,
      },
    };
    const response = await fetchOrThrow(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedUser),
    });
    dispatch(sessionActions.updateUser(await response.json()));
  };
  const configure = () => {
    onClose();
    navigate("/notifications/whatsapp");
  };
  const enabled = Boolean(user?.attributes?.whatsappEnabled);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Enviar WhatsApp</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
        {enabled ? (
          <Alert severity="success">{t("whatsappTrackingActive")}</Alert>
        ) : (
          <Alert severity="info">{t("whatsappTrackingInactive")}</Alert>
        )}
        {enabled && (
          <TextField
            label="Número destino"
            type="tel"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        )}
        {enabled && (
          <TextField
            label="Mensaje"
            multiline
            minRows={3}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        )}
        {result && (
          <Alert severity={result.ok ? "success" : "error"}>
            {result.ok ? "Mensaje enviado" : result.reason}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        {enabled ? (
          <Button color="warning" onClick={disable}>
            {t("whatsappTrackingDisable")}
          </Button>
        ) : (
          <Button variant="contained" onClick={configure}>
            {t("whatsappTrackingConfigure")}
          </Button>
        )}
        {enabled && (
          <Button variant="contained" disabled={!to || !message} onClick={send}>
            Enviar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
export default WhatsAppDialog;
