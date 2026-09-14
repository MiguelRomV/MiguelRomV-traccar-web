import { useState } from "react";
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

const WhatsAppDialog = ({ open, onClose, deviceId, deviceName }) => {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState(
    `Información del vehículo ${deviceName || ""}`,
  );
  const [result, setResult] = useState(null);
  const send = async () =>
    setResult(await sendWhatsApp({ to, message, deviceId }));
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Enviar WhatsApp</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
        <TextField
          label="Número destino"
          type="tel"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
        <TextField
          label="Mensaje"
          multiline
          minRows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        {result && (
          <Alert severity={result.ok ? "success" : "error"}>
            {result.ok ? "Mensaje enviado" : result.reason}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={!to || !message} onClick={send}>
          Enviar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default WhatsAppDialog;
