import { Grid, Paper, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import RecentEvents from "./components/RecentEvents";
const DashboardPage = () => {
  const devices = Object.values(useSelector((state) => state.devices.items));
  const positions = useSelector((state) => state.session.positions);
  const counts = {
    total: devices.length,
    moving: devices.filter((d) => positions[d.id]?.speed > 0).length,
    stopped: devices.filter(
      (d) => d.status === "online" && !(positions[d.id]?.speed > 0),
    ).length,
    offline: devices.filter((d) => d.status !== "online").length,
  };
  return (
    <Grid container spacing={2} sx={{ p: 2 }}>
      {[
        ["Total vehículos", counts.total],
        ["En ruta", counts.moving],
        ["Detenidos", counts.stopped],
        ["Offline", counts.offline],
      ].map(([title, value]) => (
        <Grid key={title} size={{ xs: 6, md: 3 }}>
          <Paper sx={{ p: 2, borderLeft: "4px solid #0A76C4" }}>
            <Typography color="text.secondary">{title}</Typography>
            <Typography variant="h4">{value}</Typography>
          </Paper>
        </Grid>
      ))}
      <Grid size={{ xs: 12, md: 5 }}>
        <RecentEvents />
      </Grid>
    </Grid>
  );
};
export default DashboardPage;
