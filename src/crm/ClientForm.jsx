import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { useTranslation } from "../common/components/LocalizationProvider";

const emptyClient = { name: "", phone: "", email: "", notes: "" };

const ClientForm = ({ open, client, busy, onClose, onSave }) => {
  const t = useTranslation();
  const [values, setValues] = useState(emptyClient);

  useEffect(() => {
    setValues(client ? { ...emptyClient, ...client } : emptyClient);
  }, [client, open]);

  const setField = (field) => (event) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        {client ? t("crmEditClient") : t("crmNewClient")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            autoFocus
            required
            label={t("sharedName")}
            value={values.name}
            onChange={setField("name")}
          />
          <TextField
            label={t("sharedPhone")}
            value={values.phone}
            onChange={setField("phone")}
          />
          <TextField
            label={t("userEmail")}
            value={values.email}
            onChange={setField("email")}
          />
          <TextField
            multiline
            minRows={3}
            label={t("crmNotes")}
            value={values.notes}
            onChange={setField("notes")}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {t("sharedCancel")}
        </Button>
        <Button
          variant="contained"
          disabled={busy || !values.name.trim()}
          onClick={() =>
            onSave({
              name: values.name.trim(),
              phone: values.phone,
              email: values.email,
              notes: values.notes,
            })
          }
        >
          {t("sharedSave")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientForm;
