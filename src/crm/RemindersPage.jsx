import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useTranslation } from "../common/components/LocalizationProvider";
import {
  createReminder,
  deleteReminder,
  listClients,
  listReminders,
  listUpcomingReminders,
  updateReminder,
} from "./api";

const dateForInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const RemindersPage = () => {
  const t = useTranslation();
  const [clients, setClients] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [filter, setFilter] = useState("upcoming");
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ clientId: "", title: "", dueAt: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [clientItems, items] = await Promise.all([
        listClients(),
        filter === "upcoming"
          ? listUpcomingReminders()
          : listReminders(
              filter === "done"
                ? true
                : filter === "pending"
                  ? false
                  : undefined,
            ),
      ]);
      setClients(clientItems);
      setReminders(items);
      setError("");
    } catch (loadError) {
      setError(loadError.message || t("crmRemindersLoadError"));
    }
  }, [filter, t]);

  useEffect(() => {
    load();
  }, [load]);

  const startCreate = () => {
    setEditing(null);
    setValues({ clientId: "", title: "", dueAt: "" });
    setOpen(true);
  };

  const startEdit = (reminder) => {
    setEditing(reminder);
    setValues({
      clientId: reminder.client_id,
      title: reminder.title,
      dueAt: dateForInput(reminder.due_at),
    });
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        clientId: Number(values.clientId),
        title: values.title.trim(),
        dueAt: new Date(values.dueAt).toISOString(),
      };
      if (editing) await updateReminder(editing.id, payload);
      else await createReminder(payload);
      setOpen(false);
      await load();
    } catch (saveError) {
      setError(saveError.message || t("crmReminderSaveError"));
    } finally {
      setBusy(false);
    }
  };

  const toggleDone = async (item) => {
    try {
      await updateReminder(item.id, { done: !item.done });
      await load();
    } catch (updateError) {
      setError(updateError.message || t("crmReminderSaveError"));
    }
  };

  const remove = async (item) => {
    if (!window.confirm(t("crmDeleteReminderConfirm"))) return;
    try {
      await deleteReminder(item.id);
      await load();
    } catch (deleteError) {
      setError(deleteError.message || t("crmReminderDeleteError"));
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Typography variant="h5" sx={{ flex: 1 }}>
          {t("crmReminders")}
        </Typography>
        <Button startIcon={<AddIcon />} onClick={startCreate}>
          {t("crmNewReminder")}
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      <ToggleButtonGroup
        exclusive
        size="small"
        value={filter}
        onChange={(_event, value) => value && setFilter(value)}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="upcoming">{t("crmUpcoming")}</ToggleButton>
        <ToggleButton value="pending">{t("crmPending")}</ToggleButton>
        <ToggleButton value="done">{t("crmDone")}</ToggleButton>
        <ToggleButton value="all">{t("crmAll")}</ToggleButton>
      </ToggleButtonGroup>
      <Stack spacing={1}>
        {reminders.map((item) => (
          <Card variant="outlined" key={item.id}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Checkbox
                checked={item.done}
                onChange={() => toggleDone(item)}
                inputProps={{ "aria-label": t("crmDone") }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography
                  fontWeight={600}
                  sx={{ textDecoration: item.done ? "line-through" : "none" }}
                >
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.client_name} · {new Date(item.due_at).toLocaleString()}
                </Typography>
              </Box>
              <Button
                size="small"
                startIcon={<EditIcon />}
                onClick={() => startEdit(item)}
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
        {!reminders.length && !error && (
          <Typography color="text.secondary">
            {t("crmRemindersEmpty")}
          </Typography>
        )}
      </Stack>
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editing ? t("crmEditReminder") : t("crmNewReminder")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl>
              <InputLabel>{t("crmClient")}</InputLabel>
              <Select
                label={t("crmClient")}
                value={values.clientId}
                onChange={(event) =>
                  setValues((old) => ({ ...old, clientId: event.target.value }))
                }
              >
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              required
              label={t("crmReminderTitle")}
              value={values.title}
              onChange={(event) =>
                setValues((old) => ({ ...old, title: event.target.value }))
              }
            />
            <TextField
              required
              type="datetime-local"
              label={t("crmDueAt")}
              value={values.dueAt}
              onChange={(event) =>
                setValues((old) => ({ ...old, dueAt: event.target.value }))
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={busy}>
            {t("sharedCancel")}
          </Button>
          <Button
            variant="contained"
            disabled={
              busy || !values.clientId || !values.title.trim() || !values.dueAt
            }
            onClick={save}
          >
            {t("sharedSave")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RemindersPage;
