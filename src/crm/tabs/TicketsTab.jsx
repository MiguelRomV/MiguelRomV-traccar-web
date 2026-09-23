import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useTranslation } from "../../common/components/LocalizationProvider";
import {
  createTicket,
  deleteTicket,
  listClients,
  listTickets,
  updateTicket,
} from "../api";

const statuses = ["open", "in_progress", "closed"];
const priorities = ["low", "normal", "high", "urgent"];
const emptyTicket = {
  subject: "",
  description: "",
  status: "open",
  priority: "normal",
  clientId: "",
};

const TicketForm = ({
  open,
  ticket,
  clientId,
  clients,
  busy,
  onClose,
  onSave,
}) => {
  const t = useTranslation();
  const [values, setValues] = useState(emptyTicket);
  useEffect(
    () =>
      setValues(
        ticket
          ? { ...emptyTicket, ...ticket, clientId: ticket.client_id }
          : { ...emptyTicket, clientId: clientId || "" },
      ),
    [ticket, clientId, open],
  );
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
        {ticket ? t("crmEditTicket") : t("crmNewTicket")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {!clientId && (
            <FormControl>
              <InputLabel>{t("crmClient")}</InputLabel>
              <Select
                label={t("crmClient")}
                value={values.clientId}
                onChange={setField("clientId")}
              >
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField
            required
            label={t("crmTicketSubject")}
            value={values.subject}
            onChange={setField("subject")}
          />
          <TextField
            multiline
            minRows={3}
            label={t("crmTicketDescription")}
            value={values.description}
            onChange={setField("description")}
          />
          <FormControl>
            <InputLabel>{t("crmTicketStatus")}</InputLabel>
            <Select
              label={t("crmTicketStatus")}
              value={values.status}
              onChange={setField("status")}
            >
              {statuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {t(`crmTicketStatus_${status}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>{t("crmPriority")}</InputLabel>
            <Select
              label={t("crmPriority")}
              value={values.priority}
              onChange={setField("priority")}
            >
              {priorities.map((priority) => (
                <MenuItem key={priority} value={priority}>
                  {t(`crmPriority_${priority}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {t("sharedCancel")}
        </Button>
        <Button
          variant="contained"
          disabled={
            busy || !values.subject.trim() || (!clientId && !values.clientId)
          }
          onClick={() =>
            onSave({
              clientId: clientId || Number(values.clientId),
              subject: values.subject.trim(),
              description: values.description,
              status: values.status,
              priority: values.priority,
            })
          }
        >
          {t("sharedSave")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const TicketsTab = ({ clientId }) => {
  const t = useTranslation();
  const [tickets, setTickets] = useState([]);
  const [clients, setClients] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [items, clientItems] = await Promise.all([
        listTickets(clientId),
        clientId ? Promise.resolve([]) : listClients(),
      ]);
      setTickets(items);
      setClients(clientItems);
      setError("");
    } catch (loadError) {
      setError(loadError.message || t("crmTicketsLoadError"));
    }
  }, [clientId, t]);
  useEffect(() => {
    load();
  }, [load]);

  const save = async (values) => {
    setBusy(true);
    try {
      if (ticket) await updateTicket(ticket.id, values);
      else await createTicket(values);
      setOpen(false);
      setTicket(null);
      await load();
    } catch (saveError) {
      setError(saveError.message || t("crmTicketSaveError"));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (item) => {
    if (!window.confirm(t("crmDeleteTicketConfirm"))) return;
    try {
      await deleteTicket(item.id);
      await load();
    } catch (deleteError) {
      setError(deleteError.message || t("crmTicketDeleteError"));
    }
  };

  return (
    <Stack spacing={2}>
      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {t("crmTickets")}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={() => {
            setTicket(null);
            setOpen(true);
          }}
        >
          {t("crmNewTicket")}
        </Button>
      </Box>
      {tickets.map((item) => (
        <Card variant="outlined" key={item.id}>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={600}>{item.subject}</Typography>
              {!clientId && (
                <Typography variant="body2" color="text.secondary">
                  {item.client_name}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {t(`crmTicketStatus_${item.status}`)} ·{" "}
                {t(`crmPriority_${item.priority}`)}
              </Typography>
              {item.description && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {item.description}
                </Typography>
              )}
            </Box>
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => {
                setTicket(item);
                setOpen(true);
              }}
            >
              {t("sharedEdit")}
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => remove(item)}
            >
              {t("sharedRemove")}
            </Button>
          </CardContent>
        </Card>
      ))}
      {!tickets.length && !error && (
        <Typography color="text.secondary">{t("crmTicketsEmpty")}</Typography>
      )}
      <TicketForm
        key={`${open}-${ticket?.id || "new"}`}
        open={open}
        ticket={ticket}
        clientId={clientId}
        clients={clients}
        busy={busy}
        onClose={() => setOpen(false)}
        onSave={save}
      />
    </Stack>
  );
};

export default TicketsTab;
