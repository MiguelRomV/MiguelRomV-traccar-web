import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import TuneIcon from "@mui/icons-material/Tune";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import StopIcon from "@mui/icons-material/Stop";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import MapView from "../map/core/MapView";
import MapRoutePath from "../map/MapRoutePath";
import MapPositionMarkers from "../map/MapPositionMarkers";
import MapCamera from "../map/MapCamera";
import MapGeofence from "../map/MapGeofence";
import MapScale from "../map/MapScale";
import MapOverlay from "../map/overlay/MapOverlay";
import ReportFilter from "../reports/components/ReportFilter";
import fetchOrThrow from "../common/util/fetchOrThrow";
import { useCatchCallback } from "../reactHelper";
import ReplayTimeline from "./replay/ReplayTimeline";
import ReplayChart from "./replay/ReplayChart";
import ReplayMarkers from "./replay/ReplayMarkers";
import ReplayDrawToolbar from "./replay/ReplayDrawToolbar";

const ReplayPage = () => {
  const timerRef = useRef();
  const [searchParams, setSearchParams] = useSearchParams();
  const devices = useSelector((state) => state.devices.items);
  const livePositions = useSelector((state) => state.session.positions);
  const selectedStoreId = useSelector((state) => state.devices.selectedId);
  const defaultDeviceId =
    Number(searchParams.get("deviceId")) || selectedStoreId;
  const [selectedDeviceId, setSelectedDeviceId] = useState(
    defaultDeviceId || "",
  );
  const [period, setPeriod] = useState("today");
  const [positions, setPositions] = useState([]);
  const [events, setEvents] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [tab, setTab] = useState("chart");
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const load = useCatchCallback(async ({ deviceIds, from: start, to: end }) => {
    const deviceId = Number(deviceIds[0]);
    if (!deviceId || !start || !end) return;
    setLoading(true);
    setSelectedDeviceId(deviceId);
    const query = new URLSearchParams({ deviceId, from: start, to: end });
    try {
      const [positionsResponse, eventsResponse] = await Promise.all([
        fetchOrThrow(`/api/positions?${query}`),
        fetchOrThrow(`/api/events?${query}`),
      ]);
      setPositions(await positionsResponse.json());
      setEvents(await eventsResponse.json());
      setIndex(0);
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDeviceId && from && to)
      load({ deviceIds: [selectedDeviceId], from, to });
  }, [from, load, selectedDeviceId, to]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (playing && index < positions.length - 1) {
      timerRef.current = setInterval(
        () => setIndex((value) => Math.min(value + 1, positions.length - 1)),
        500 / playbackRate,
      );
    }
    return () => clearInterval(timerRef.current);
  }, [index, playbackRate, playing, positions.length]);

  useEffect(() => {
    if (index >= positions.length - 1) setPlaying(false);
  }, [index, positions.length]);

  const show = () => {
    const newParams = new URLSearchParams(searchParams);
    const start =
      period === "today"
        ? dayjs().startOf("day")
        : dayjs().subtract(1, "day").startOf("day");
    const end =
      period === "today"
        ? dayjs().endOf("day")
        : dayjs().subtract(1, "day").endOf("day");
    newParams.set("deviceId", selectedDeviceId);
    newParams.set("from", start.toISOString());
    newParams.set("to", end.toISOString());
    setSearchParams(newParams, { replace: true });
  };

  const otherPositions = useMemo(
    () =>
      Object.values(livePositions)
        .filter((position) => position.deviceId !== Number(selectedDeviceId))
        .map((position) => ({
          ...position,
          markerOpacity:
            Date.now() - Date.parse(position.fixTime) < 300000 ? 1 : 0.5,
        })),
    [livePositions, selectedDeviceId],
  );
  const current = positions[index];

  return (
    <Box sx={{ height: "100%", bgcolor: "#F4F6F8" }}>
      <MapView>
        <MapOverlay />
        <MapGeofence />
        <MapRoutePath positions={positions} color="#E53935" width={5} />
        <ReplayMarkers positions={positions} events={events} />
        <MapPositionMarkers
          positions={otherPositions}
          showStatus
          showTitles
          titleField="speed"
        />
        {current && (
          <MapPositionMarkers positions={[current]} titleField="fixTime" />
        )}
        <MapCamera positions={positions} />
      </MapView>
      <MapScale />
      <ReplayDrawToolbar />

      <Paper
        elevation={4}
        sx={{
          position: "fixed",
          left: 12,
          top: 12,
          bottom: 12,
          width: 320,
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tabs value="history" sx={{ flex: 1 }}>
            <Tab value="history" label="Historial" />
          </Tabs>
          <Button
            size="small"
            startIcon={<TuneIcon />}
            onClick={() => setFilterOpen(true)}
          >
            Filtro extendido
          </Button>
        </Box>
        <Box sx={{ p: 1.5, display: "grid", gap: 1 }}>
          <FormControl size="small">
            <InputLabel>GPS</InputLabel>
            <Select
              label="GPS"
              value={selectedDeviceId}
              onChange={(event) => setSelectedDeviceId(event.target.value)}
            >
              {Object.values(devices).map((device) => (
                <MenuItem key={device.id} value={device.id}>
                  {device.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Filtro</InputLabel>
            <Select
              label="Filtro"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <MenuItem value="today">Hoy</MenuItem>
              <MenuItem value="yesterday">Ayer</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<VisibilityIcon />}
            disabled={!selectedDeviceId || loading}
            onClick={show}
          >
            Mostrar
          </Button>
        </Box>
        <ReplayTimeline positions={positions} onSelect={setIndex} />
      </Paper>

      <Paper
        elevation={5}
        sx={{
          position: "fixed",
          left: 344,
          right: 12,
          bottom: 12,
          zIndex: 3,
          minHeight: 285,
          maxHeight: "42vh",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            sx={{ flex: 1 }}
          >
            <Tab value="data" label="Datos" />
            <Tab value="chart" label="Gráfico" />
            <Tab value="messages" label="Mensajes" />
          </Tabs>
          {tab === "chart" && (
            <>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Variable</InputLabel>
                <Select label="Variable" value="speed">
                  <MenuItem value="speed">Velocidad</MenuItem>
                </Select>
              </FormControl>
              <IconButton
                onClick={() => setPlaying(true)}
                disabled={!positions.length}
              >
                <PlayArrowIcon />
              </IconButton>
              <IconButton onClick={() => setPlaying(false)}>
                <PauseIcon />
              </IconButton>
              <IconButton
                onClick={() => {
                  setPlaying(false);
                  setIndex(0);
                }}
              >
                <StopIcon />
              </IconButton>
              <FormControl size="small" sx={{ width: 72, mr: 1 }}>
                <Select
                  value={playbackRate}
                  onChange={(event) => setPlaybackRate(event.target.value)}
                >
                  {[1, 2, 4, 8].map((rate) => (
                    <MenuItem key={rate} value={rate}>
                      x{rate}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </Box>
        {tab === "chart" && positions.length > 0 && (
          <Slider
            size="small"
            min={0}
            max={positions.length - 1}
            value={index}
            onChange={(_, value) => setIndex(value)}
            sx={{ mx: 2, width: "calc(100% - 32px)", mb: -1 }}
          />
        )}
        {tab === "chart" && <ReplayChart positions={positions} index={index} />}
        {tab === "data" && (
          <Box sx={{ p: 2 }}>
            {current ? (
              <>
                <Typography>
                  {new Date(current.fixTime).toLocaleString()}
                </Typography>
                <Typography color="text.secondary">
                  {current.latitude.toFixed(5)}, {current.longitude.toFixed(5)}
                </Typography>
              </>
            ) : (
              <Typography color="text.secondary">Sin datos</Typography>
            )}
          </Box>
        )}
        {tab === "messages" && (
          <Box sx={{ p: 2, overflowY: "auto", maxHeight: 220 }}>
            {events.map((event) => (
              <Typography key={event.id} variant="body2">
                {event.type} ·{" "}
                {new Date(event.eventTime || event.serverTime).toLocaleString()}
              </Typography>
            ))}
          </Box>
        )}
      </Paper>

      <Dialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogContent>
          <ReportFilter
            onShow={(values) => {
              load(values);
              setFilterOpen(false);
            }}
            deviceType="single"
            loading={loading}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ReplayPage;
