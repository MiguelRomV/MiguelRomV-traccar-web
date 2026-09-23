import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import OverviewTab from "./tabs/OverviewTab";
import MessagesTab from "./tabs/MessagesTab";
import DealsTab from "./tabs/DealsTab";
import TicketsTab from "./tabs/TicketsTab";
import InvoicesTab from "./tabs/InvoicesTab";
import { useTranslation } from "../common/components/LocalizationProvider";

const tabs = ["overview", "messages", "deals", "tickets", "invoices"];

const ClientDetail = ({
  client,
  devices,
  busy,
  onEdit,
  onDelete,
  onLink,
  onUnlink,
}) => {
  const t = useTranslation();
  const [tab, setTab] = useState("overview");
  const [deviceId, setDeviceId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const linkedIds = new Set(client.devices.map((device) => device.id));
  const availableDevices = devices.filter(
    (device) => !linkedIds.has(device.id),
  );

  const tabLabels = {
    overview: "crmOverview",
    messages: "crmMessages",
    deals: "crmDeals",
    tickets: "crmTickets",
    invoices: "crmInvoices",
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 2 }}>
        <Typography variant="h4" sx={{ flex: 1, overflowWrap: "anywhere" }}>
          {client.name}
        </Typography>
        <Button startIcon={<EditOutlinedIcon />} onClick={onEdit}>
          {t("sharedEdit")}
        </Button>
        <Button
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setConfirmDelete(true)}
        >
          {t("sharedRemove")}
        </Button>
      </Box>
      <Tabs
        value={tab}
        onChange={(_event, value) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {tabs.map((value) => (
          <Tab key={value} value={value} label={t(tabLabels[value])} />
        ))}
      </Tabs>
      <Box sx={{ pt: 2 }}>
        {tab === "overview" ? (
          <OverviewTab client={client} />
        ) : tab === "messages" ? (
          <MessagesTab client={client} />
        ) : tab === "deals" ? (
          <DealsTab client={client} />
        ) : tab === "tickets" ? (
          <TicketsTab clientId={client.id} />
        ) : tab === "invoices" ? (
          <InvoicesTab clientId={client.id} />
        ) : (
          <Alert severity="info">{t("crmPhasePlaceholder")}</Alert>
        )}
      </Box>
      {tab === "overview" && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t("crmDevices")}
          </Typography>
          {client.devices.map((device) => (
            <Box
              key={device.id}
              sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.75 }}
            >
              <Typography sx={{ flex: 1 }}>{device.name}</Typography>
              <Button
                size="small"
                color="error"
                disabled={busy}
                onClick={() => onUnlink(device.id)}
              >
                {t("crmUnlinkDevice")}
              </Button>
            </Box>
          ))}
          {!client.devices.length && (
            <Typography color="text.secondary">{t("crmNoDevices")}</Typography>
          )}
          <Box sx={{ display: "flex", gap: 1, mt: 2, maxWidth: 520 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t("crmSelectDevice")}</InputLabel>
              <Select
                value={deviceId}
                label={t("crmSelectDevice")}
                onChange={(event) => setDeviceId(event.target.value)}
              >
                {availableDevices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    {device.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              disabled={busy || !deviceId}
              onClick={async () => {
                await onLink(deviceId);
                setDeviceId("");
              }}
            >
              {t("crmLinkDevice")}
            </Button>
          </Box>
        </Box>
      )}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>
          {t("crmDeleteConfirm")} {client.name}?
        </DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>
            {t("sharedCancel")}
          </Button>
          <Button
            color="error"
            disabled={busy}
            onClick={async () => {
              await onDelete();
              setConfirmDelete(false);
            }}
          >
            {t("sharedRemove")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientDetail;
