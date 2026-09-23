import { useEffect, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useTranslation } from "../../common/components/LocalizationProvider";
import { linkTraccarUser, listTraccarUsers } from "../api";

const OverviewTab = ({ client, onRefresh }) => {
  const t = useTranslation();
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    listTraccarUsers()
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, []);
  const saveUserLink = async (nextUserId) => {
    setBusy(true);
    try {
      await linkTraccarUser(client.id, nextUserId);
      await onRefresh();
    } catch (e) {
      setError(e.message || t("crmUserLinkError"));
    } finally {
      setBusy(false);
    }
  };
  const fields = [
    ["sharedPhone", client.phone],
    ["userEmail", client.email],
    ["crmNotes", client.notes],
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            {t("crmLinkedTraccarUser")}
          </Typography>
          {client.traccarUser ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ flex: 1 }}>
                {client.traccarUser.name} · {client.traccarUser.email || "—"}
              </Typography>
              <Button disabled={busy} onClick={() => saveUserLink(null)}>
                {t("crmUnlinkTraccarUser")}
              </Button>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1}>
              <FormControl fullWidth size="small">
                <InputLabel>{t("crmSelectTraccarUser")}</InputLabel>
                <Select
                  value={userId}
                  label={t("crmSelectTraccarUser")}
                  onChange={(event) => setUserId(event.target.value)}
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name} · {user.email || "—"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                disabled={busy || !userId}
                onClick={() => saveUserLink(Number(userId))}
              >
                {t("crmLinkTraccarUser")}
              </Button>
            </Stack>
          )}
          {error && <Typography color="error">{error}</Typography>}
        </Box>
        {fields.map(([label, value]) => (
          <Box key={label}>
            <Typography variant="subtitle2" color="text.secondary">
              {t(label)}
            </Typography>
            <Typography
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {value || "—"}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

export default OverviewTab;
