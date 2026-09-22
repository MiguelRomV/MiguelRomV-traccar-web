import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import { useTranslation } from "../../common/components/LocalizationProvider";
import { listMessages, syncMessages } from "../api";

const PAGE_SIZE = 50;

const isWhatsAppPhone = (phone) => {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
};

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

const MessagesTab = ({ client }) => {
  const t = useTranslation();
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [syncResult, setSyncResult] = useState(null);
  const validPhone = useMemo(
    () => isWhatsAppPhone(client.phone),
    [client.phone],
  );

  const load = useCallback(
    async (nextOffset = 0, append = false) => {
      setLoading(true);
      try {
        const result = await listMessages(client.id, PAGE_SIZE, nextOffset);
        setItems((current) =>
          append ? [...result.items, ...current] : result.items,
        );
        setOffset(nextOffset);
        setTotal(result.total);
        setError("");
      } catch (loadError) {
        setError(loadError.message || t("crmMessagesLoadError"));
      } finally {
        setLoading(false);
      }
    },
    [client.id, t],
  );

  useEffect(() => {
    load();
  }, [load]);

  const sync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncMessages(client.id);
      setSyncResult(result.inserted);
      await load();
    } catch (syncError) {
      setError(syncError.message || t("crmSyncError"));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Stack spacing={2}>
      {!validPhone && (
        <Alert severity="warning">{t("crmPhoneFormatWarning")}</Alert>
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {t("crmMessages")}
        </Typography>
        <Button
          variant="contained"
          startIcon={
            syncing ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SyncIcon />
            )
          }
          disabled={!validPhone || syncing || loading}
          onClick={sync}
        >
          {t("crmSyncMessages")}
        </Button>
      </Box>
      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {syncResult !== null && (
        <Alert severity="success">
          {t("crmSyncComplete")}: {syncResult}
        </Alert>
      )}
      {loading && !items.length ? (
        <Box sx={{ display: "grid", minHeight: 120, placeItems: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={1}>
          {items.map((message) => (
            <Paper
              key={message.wa_message_id || message.id}
              variant="outlined"
              sx={{
                p: 1.5,
                maxWidth: "85%",
                alignSelf:
                  message.direction === "out" ? "flex-end" : "flex-start",
                bgcolor:
                  message.direction === "out"
                    ? "action.hover"
                    : "background.paper",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {message.direction === "out"
                  ? t("crmMessageSent")
                  : t("crmMessageReceived")}
                {" · "}
                {formatDate(message.created_at)}
              </Typography>
              <Typography
                sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
              >
                {message.body || t("crmNonTextMessage")}
              </Typography>
            </Paper>
          ))}
          {!items.length && !loading && (
            <Typography color="text.secondary">
              {t("crmMessagesEmpty")}
            </Typography>
          )}
        </Stack>
      )}
      {offset + items.length < total && (
        <Button
          variant="text"
          disabled={loading}
          onClick={() => load(offset + PAGE_SIZE, true)}
        >
          {t("crmLoadOlderMessages")}
        </Button>
      )}
    </Stack>
  );
};

export default MessagesTab;
