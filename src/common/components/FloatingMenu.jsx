import { useState } from "react";
import { Fab, Stack } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import useCurrentRole from "../auth/useCurrentRole";
import { useTranslation } from "./LocalizationProvider";
const items = [
  ["dashboardTitle", "/dashboard", "dashboard"],
  ["navigationServices", "/services", "services"],
  ["navigationDeliveries", "/deliveries", "deliveries"],
  ["navigationExpenses", "/expenses", "expenses"],
  ["navigationPhotos", "/photos", "photos"],
  ["navigationVideo", "/video", "video"],
  ["navigationChat", "/chat", "chat"],
  ["navigationHelp", "/help", "help"],
];
export default () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { can } = useCurrentRole();
  const t = useTranslation();
  return (
    <Stack
      spacing={1}
      sx={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 20,
        alignItems: "end",
      }}
    >
      {open &&
        items
          .filter(([, , action]) => can(action))
          .map(([label, path]) => (
            <Fab
              key={path}
              size="small"
              variant="extended"
              onClick={() => navigate(path)}
            >
              {t(label)}
            </Fab>
          ))}
      <Fab color="primary" onClick={() => setOpen((value) => !value)}>
        <AddIcon />
      </Fab>
    </Stack>
  );
};
