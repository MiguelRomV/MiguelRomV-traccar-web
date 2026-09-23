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
  createInvoice,
  deleteInvoice,
  listClients,
  listInvoices,
  updateInvoice,
} from "../api";

const statuses = ["pending", "paid", "overdue", "cancelled"];
const emptyInvoice = {
  number: "",
  amount: "",
  currency: "MXN",
  status: "pending",
  issuedAt: "",
  paidAt: "",
  clientId: "",
};

const InvoiceForm = ({
  open,
  invoice,
  clientId,
  clients,
  busy,
  onClose,
  onSave,
}) => {
  const t = useTranslation();
  const [values, setValues] = useState(emptyInvoice);
  useEffect(
    () =>
      setValues(
        invoice
          ? {
              ...emptyInvoice,
              ...invoice,
              clientId: invoice.client_id,
              issuedAt: invoice.issued_at || "",
              paidAt: invoice.paid_at || "",
            }
          : { ...emptyInvoice, clientId: clientId || "" },
      ),
    [invoice, clientId, open],
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
        {invoice ? t("crmEditInvoice") : t("crmNewInvoice")}
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
            label={t("crmInvoiceNumber")}
            value={values.number}
            onChange={setField("number")}
          />
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              required
              type="number"
              inputProps={{ min: 0, step: "0.01" }}
              label={t("crmAmount")}
              value={values.amount}
              onChange={setField("amount")}
            />
            <TextField
              label={t("crmCurrency")}
              value={values.currency}
              onChange={setField("currency")}
              inputProps={{ maxLength: 3 }}
            />
          </Box>
          <FormControl>
            <InputLabel>{t("crmInvoiceStatus")}</InputLabel>
            <Select
              label={t("crmInvoiceStatus")}
              value={values.status}
              onChange={setField("status")}
            >
              {statuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {t(`crmInvoiceStatus_${status}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            type="date"
            label={t("crmIssuedAt")}
            value={values.issuedAt}
            onChange={setField("issuedAt")}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            type="date"
            label={t("crmPaidAt")}
            value={values.paidAt}
            onChange={setField("paidAt")}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {t("sharedCancel")}
        </Button>
        <Button
          variant="contained"
          disabled={
            busy || values.amount === "" || (!clientId && !values.clientId)
          }
          onClick={() =>
            onSave({
              clientId: clientId || Number(values.clientId),
              number: values.number,
              amount: Number(values.amount),
              currency: values.currency.trim().toUpperCase(),
              status: values.status,
              issuedAt: values.issuedAt || null,
              paidAt: values.paidAt || null,
            })
          }
        >
          {t("sharedSave")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const InvoicesTab = ({ clientId }) => {
  const t = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [items, clientItems] = await Promise.all([
        listInvoices(clientId),
        clientId ? Promise.resolve([]) : listClients(),
      ]);
      setInvoices(items);
      setClients(clientItems);
      setError("");
    } catch (loadError) {
      setError(loadError.message || t("crmInvoicesLoadError"));
    }
  }, [clientId, t]);
  useEffect(() => {
    load();
  }, [load]);

  const save = async (values) => {
    setBusy(true);
    try {
      if (invoice) await updateInvoice(invoice.id, values);
      else await createInvoice(values);
      setOpen(false);
      setInvoice(null);
      await load();
    } catch (saveError) {
      setError(saveError.message || t("crmInvoiceSaveError"));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (item) => {
    if (!window.confirm(t("crmDeleteInvoiceConfirm"))) return;
    try {
      await deleteInvoice(item.id);
      await load();
    } catch (deleteError) {
      setError(deleteError.message || t("crmInvoiceDeleteError"));
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
          {t("crmInvoices")}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={() => {
            setInvoice(null);
            setOpen(true);
          }}
        >
          {t("crmNewInvoice")}
        </Button>
      </Box>
      {invoices.map((item) => (
        <Card variant="outlined" key={item.id}>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={600}>
                {item.number || t("crmInvoiceNumberUnset")}
              </Typography>
              {!clientId && (
                <Typography variant="body2" color="text.secondary">
                  {item.client_name}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {item.amount} {item.currency} ·{" "}
                {t(`crmInvoiceStatus_${item.status}`)} · {item.issued_at}
              </Typography>
            </Box>
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => {
                setInvoice(item);
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
      {!invoices.length && !error && (
        <Typography color="text.secondary">{t("crmInvoicesEmpty")}</Typography>
      )}
      <InvoiceForm
        key={`${open}-${invoice?.id || "new"}`}
        open={open}
        invoice={invoice}
        clientId={clientId}
        clients={clients}
        busy={busy}
        onClose={() => setOpen(false)}
        onSave={save}
      />
    </Stack>
  );
};

export default InvoicesTab;
