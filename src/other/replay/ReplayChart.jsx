import { Box, IconButton, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { speedFromKnots } from "../../common/util/converter";

const ReplayChart = ({ positions, index }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState(0);
  const data = useMemo(
    () =>
      positions.map((position) => ({
        time: Date.parse(position.fixTime),
        speed: Math.round(speedFromKnots(position.speed || 0, "kmh")),
      })),
    [positions],
  );
  const visibleCount = Math.max(2, Math.ceil(data.length / zoom));
  const maxOffset = Math.max(0, data.length - visibleCount);
  const visible = data.slice(offset, offset + visibleCount);
  const playhead = data[index]?.time;
  const dayStart = data.length
    ? new Date(data[0].time).setHours(0, 0, 0, 0)
    : 0;
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const ticks = Array.from(
    { length: 13 },
    (_, tick) => dayStart + tick * 2 * 60 * 60 * 1000,
  );

  if (!data.length) {
    return (
      <Typography sx={{ p: 3 }} color="text.secondary">
        Sin datos en el periodo seleccionado
      </Typography>
    );
  }

  return (
    <Box sx={{ position: "relative", height: 220, px: 1 }}>
      <Box sx={{ position: "absolute", right: 8, top: 0, zIndex: 1 }}>
        <IconButton
          size="small"
          onClick={() =>
            setOffset(Math.max(0, offset - Math.ceil(visibleCount / 3)))
          }
        >
          <ChevronLeftIcon />
        </IconButton>
        <IconButton
          size="small"
          onClick={() =>
            setOffset(Math.min(maxOffset, offset + Math.ceil(visibleCount / 3)))
          }
        >
          <ChevronRightIcon />
        </IconButton>
        <IconButton size="small" onClick={() => setZoom(Math.min(8, zoom * 2))}>
          <AddIcon />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => {
            setZoom(Math.max(1, zoom / 2));
            setOffset(0);
          }}
        >
          <RemoveIcon />
        </IconButton>
      </Box>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={visible}
          margin={{ top: 34, right: 20, left: 4, bottom: 0 }}
        >
          <defs>
            <linearGradient id="replaySpeed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0A76C4" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#0A76C4" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            domain={zoom === 1 ? [dayStart, dayEnd] : ["dataMin", "dataMax"]}
            ticks={zoom === 1 ? ticks : undefined}
            tickFormatter={(value) =>
              new Date(value).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
            minTickGap={45}
          />
          <YAxis
            domain={[0, 125]}
            ticks={[0, 25, 50, 75, 100, 125]}
            unit=" km/h"
            width={72}
          />
          <Tooltip
            labelFormatter={(value) => new Date(value).toLocaleString()}
            formatter={(value) => [`${value} km/h`, "Velocidad"]}
          />
          <Area
            type="monotone"
            dataKey="speed"
            stroke="#0A76C4"
            strokeWidth={2}
            fill="url(#replaySpeed)"
          />
          {playhead && (
            <ReferenceLine x={playhead} stroke="#E53935" strokeWidth={2} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ReplayChart;
