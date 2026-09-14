import { useState } from "react";
import { Fab, Stack } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
const items = [
  ["Dashboard", "/dashboard"],
  ["Servicios", "/services"],
  ["Entregas", "/deliveries"],
  ["Gastos", "/expenses"],
  ["Fotos", "/photos"],
  ["Video", "/video"],
  ["Chat", "/chat"],
  ["Ayuda", "/help"],
];
export default () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
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
        items.map(([label, path]) => (
          <Fab
            key={path}
            size="small"
            variant="extended"
            onClick={() => navigate(path)}
          >
            {label}
          </Fab>
        ))}
      <Fab color="primary" onClick={() => setOpen((value) => !value)}>
        <AddIcon />
      </Fab>
    </Stack>
  );
};
