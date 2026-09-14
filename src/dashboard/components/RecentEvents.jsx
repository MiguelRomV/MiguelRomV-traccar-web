import { useEffect, useState } from "react";
import {
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import fetchOrThrow from "../../common/util/fetchOrThrow";

const RecentEvents = () => {
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();
  useEffect(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    fetchOrThrow(
      `/api/reports/events?from=${from.toISOString()}&to=${new Date().toISOString()}`,
    )
      .then((response) => response.json())
      .then((items) => setEvents(items.slice(-10).reverse()))
      .catch(() => {});
  }, []);
  return (
    <Paper sx={{ p: 2, height: 400, overflow: "auto" }}>
      <Typography variant="h6">Últimos eventos</Typography>
      <List>
        {events.length ? (
          events.map((event) => (
            <ListItemButton
              key={event.id}
              onClick={() =>
                navigate(
                  `/replay?deviceId=${event.deviceId}&from=${event.eventTime || event.serverTime}`,
                )
              }
            >
              <ListItemText
                primary={event.type}
                secondary={new Date(
                  event.eventTime || event.serverTime,
                ).toLocaleTimeString()}
              />
            </ListItemButton>
          ))
        ) : (
          <Typography>Sin eventos recientes</Typography>
        )}
      </List>
    </Paper>
  );
};
export default RecentEvents;
