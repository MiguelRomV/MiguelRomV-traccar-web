import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import { useTranslation } from "../common/components/LocalizationProvider";
import {
  createClient,
  deleteClient,
  linkDevice,
  listClients,
  unlinkDevice,
  updateClient,
} from "./api";
import ClientDetail from "./ClientDetail";
import ClientForm from "./ClientForm";
import ClientList from "./ClientList";

const CrmPage = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const devices = useSelector((state) => state.devices.items);
  const [clients, setClients] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      setClients(await listClients());
      setError("");
    } catch (loadError) {
      setError(loadError.message || t("crmLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedId) || null,
    [clients, selectedId],
  );

  const saveClient = async (values) => {
    setBusy(true);
    try {
      const saved = editingClient
        ? await updateClient(editingClient.id, values)
        : await createClient(values);
      await loadClients();
      setSelectedId(saved.id);
      setFormOpen(false);
      setEditingClient(null);
    } catch (saveError) {
      setError(saveError.message || t("crmSaveError"));
    } finally {
      setBusy(false);
    }
  };

  const removeClient = async (client) => {
    setBusy(true);
    try {
      await deleteClient(client.id);
      if (selectedId === client.id) setSelectedId(null);
      await loadClients();
    } catch (deleteError) {
      setError(deleteError.message || t("crmDeleteError"));
    } finally {
      setBusy(false);
    }
  };

  const changeDevices = async (action, clientId, deviceId) => {
    setBusy(true);
    try {
      await action(clientId, deviceId);
      await loadClients();
      setError("");
    } catch (deviceError) {
      setError(deviceError.message || t("crmDeviceError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      sx={{ height: "100%", minHeight: 0 }}
    >
      <ClientList
        clients={clients}
        selectedId={selectedId}
        loading={loading}
        onSelect={setSelectedId}
        onCreate={() => {
          setEditingClient(null);
          setFormOpen(true);
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 }, overflow: "auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography variant="h5" sx={{ flex: 1 }}>
            {t("crmTitle")}
          </Typography>
          <Button
            startIcon={<ViewKanbanIcon />}
            onClick={() => navigate("/crm/deals")}
          >
            {t("crmDealsBoard")}
          </Button>
        </Box>
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Box sx={{ display: "grid", minHeight: 180, placeItems: "center" }}>
            <CircularProgress />
          </Box>
        ) : selectedClient ? (
          <ClientDetail
            key={selectedClient.id}
            client={selectedClient}
            devices={Object.values(devices)}
            busy={busy}
            onEdit={() => {
              setEditingClient(selectedClient);
              setFormOpen(true);
            }}
            onDelete={() => removeClient(selectedClient)}
            onLink={(deviceId) =>
              changeDevices(linkDevice, selectedClient.id, deviceId)
            }
            onUnlink={(deviceId) =>
              changeDevices(unlinkDevice, selectedClient.id, deviceId)
            }
          />
        ) : (
          <Alert severity="info">{t("crmSelectClient")}</Alert>
        )}
      </Box>
      <ClientForm
        key={`${formOpen}-${editingClient?.id || "new"}`}
        open={formOpen}
        client={editingClient}
        busy={busy}
        onClose={() => setFormOpen(false)}
        onSave={saveClient}
      />
    </Stack>
  );
};

export default CrmPage;
