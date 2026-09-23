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
import { createDeal, deleteDeal, listDeals, updateDeal } from "../api";

const stages = ["lead", "contactado", "cotización", "ganado", "perdido"];
const emptyDeal = {
  title: "",
  amount: "",
  currency: "MXN",
  stage: "lead",
  expectedClose: "",
};

const DealForm = ({ open, deal, clientId, busy, onClose, onSave }) => {
  const t = useTranslation();
  const [values, setValues] = useState(emptyDeal);

  useEffect(() => {
    setValues(
      deal
        ? {
            title: deal.title || "",
            amount: deal.amount ?? "",
            currency: deal.currency || "MXN",
            stage: deal.stage || "lead",
            expectedClose: deal.expected_close || "",
          }
        : emptyDeal,
    );
  }, [deal, open]);

  const setField = (field) => (event) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{deal ? t("crmEditDeal") : t("crmNewDeal")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            required
            label={t("crmDealTitle")}
            value={values.title}
            onChange={setField("title")}
          />
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
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
            <InputLabel>{t("crmStage")}</InputLabel>
            <Select
              label={t("crmStage")}
              value={values.stage}
              onChange={setField("stage")}
            >
              {stages.map((stage) => (
                <MenuItem key={stage} value={stage}>
                  {t(`crmStage_${stage}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            type="date"
            label={t("crmExpectedClose")}
            value={values.expectedClose}
            onChange={setField("expectedClose")}
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
          disabled={busy || !values.title.trim()}
          onClick={() =>
            onSave({
              clientId,
              title: values.title.trim(),
              amount: values.amount === "" ? null : Number(values.amount),
              currency: values.currency.trim().toUpperCase(),
              stage: values.stage,
              expectedClose: values.expectedClose || null,
            })
          }
        >
          {t("sharedSave")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DealsTab = ({ client }) => {
  const t = useTranslation();
  const [deals, setDeals] = useState([]);
  const [deal, setDeal] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setDeals(await listDeals(client.id));
      setError("");
    } catch (loadError) {
      setError(loadError.message || t("crmDealsLoadError"));
    }
  }, [client.id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (values) => {
    setBusy(true);
    try {
      if (deal) await updateDeal(deal.id, values);
      else await createDeal(values);
      setFormOpen(false);
      setDeal(null);
      await load();
    } catch (saveError) {
      setError(saveError.message || t("crmDealSaveError"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteDeal(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (deleteError) {
      setError(deleteError.message || t("crmDealDeleteError"));
    } finally {
      setBusy(false);
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
          {t("crmDeals")}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={() => {
            setDeal(null);
            setFormOpen(true);
          }}
        >
          {t("crmNewDeal")}
        </Button>
      </Box>
      {deals.map((item) => (
        <Card variant="outlined" key={item.id}>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={600}>{item.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t(`crmStage_${item.stage}`)} · {item.amount ?? "—"}{" "}
                {item.currency}
              </Typography>
            </Box>
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => {
                setDeal(item);
                setFormOpen(true);
              }}
            >
              {t("sharedEdit")}
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteTarget(item)}
            >
              {t("sharedRemove")}
            </Button>
          </CardContent>
        </Card>
      ))}
      {!deals.length && !error && (
        <Typography color="text.secondary">{t("crmDealsEmpty")}</Typography>
      )}
      <DealForm
        key={`${formOpen}-${deal?.id || "new"}`}
        open={formOpen}
        deal={deal}
        clientId={client.id}
        busy={busy}
        onClose={() => setFormOpen(false)}
        onSave={save}
      />
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      >
        <DialogTitle>{t("crmDeleteDealConfirm")}</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>
            {t("sharedCancel")}
          </Button>
          <Button color="error" disabled={busy} onClick={remove}>
            {t("sharedRemove")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default DealsTab;
