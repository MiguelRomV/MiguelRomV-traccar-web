import { useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "../common/components/LocalizationProvider";

const ClientList = ({ clients, selectedId, loading, onSelect, onCreate }) => {
  const t = useTranslation();
  const [search, setSearch] = useState("");
  const filteredClients = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return clients;
    return clients.filter((client) =>
      [client.name, client.phone, client.email]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase().includes(query)),
    );
  }, [clients, search]);

  return (
    <Box
      sx={{
        width: { xs: "100%", md: 320 },
        flexShrink: 0,
        borderRight: { md: 1 },
        borderBottom: { xs: 1, md: 0 },
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        maxHeight: { xs: 300, md: "none" },
      }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {t("crmClients")}
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={onCreate}>
          {t("crmNewClient")}
        </Button>
      </Box>
      <Box sx={{ px: 2, pb: 1.5 }}>
        <TextField
          fullWidth
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("crmSearchClients")}
          slotProps={{
            input: {
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1 }} />,
            },
          }}
        />
      </Box>
      <Divider />
      {loading ? (
        <Box sx={{ display: "grid", minHeight: 100, placeItems: "center" }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <List dense sx={{ overflow: "auto", py: 0 }}>
          {filteredClients.map((client) => (
            <ListItemButton
              key={client.id}
              selected={client.id === selectedId}
              onClick={() => onSelect(client.id)}
            >
              <ListItemText
                primary={client.name}
                secondary={client.phone || client.email || t("crmNoContact")}
                slotProps={{
                  primary: { noWrap: true },
                  secondary: { noWrap: true },
                }}
              />
            </ListItemButton>
          ))}
          {!filteredClients.length && (
            <Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>
              {search ? t("sharedNoData") : t("crmEmptyClients")}
            </Typography>
          )}
        </List>
      )}
    </Box>
  );
};

export default ClientList;
