import { Box, Typography } from "@mui/material";
import { useMemo } from "react";
import { formatTime } from "../../common/util/formatter";

const distance = (a, b) => {
  const radians = (value) => (value * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) *
      Math.cos(radians(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const duration = (from, to) => {
  const seconds = Math.max(
    0,
    Math.round((Date.parse(to) - Date.parse(from)) / 1000),
  );
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${seconds % 60} s`;
};

const ReplayTimeline = ({ positions, events, onSelect }) => {
  const items = useMemo(() => {
    if (!positions.length) return [];
    const result = [];
    let start = 0;
    let moving = positions[0].speed > 0;
    let kilometers = 0;
    for (let index = 1; index < positions.length; index += 1) {
      kilometers += distance(positions[index - 1], positions[index]);
      const nextMoving = positions[index].speed > 0;
      if (nextMoving !== moving || index === positions.length - 1) {
        const end = index === positions.length - 1 ? index : index - 1;
        result.push({
          type: moving ? "moving" : "stopped",
          start,
          end,
          kilometers,
        });
        start = index;
        moving = nextMoving;
        kilometers = 0;
      }
      const previousIgnition = positions[index - 1].attributes?.ignition;
      const ignition = positions[index].attributes?.ignition;
      if (ignition !== undefined && ignition !== previousIgnition) {
        result.push({
          type: ignition ? "ignitionOn" : "ignitionOff",
          start: index,
          end: index,
        });
      }
    }
    events
      .filter((event) => ["ignitionOn", "ignitionOff"].includes(event.type))
      .forEach((event) => {
        const eventTime = Date.parse(event.eventTime || event.serverTime);
        const index = positions.reduce(
          (best, position, candidate) =>
            Math.abs(Date.parse(position.fixTime) - eventTime) <
            Math.abs(Date.parse(positions[best].fixTime) - eventTime)
              ? candidate
              : best,
          0,
        );
        result.push({ type: event.type, start: index, end: index });
      });
    return result.sort((a, b) => a.start - b.start);
  }, [events, positions]);

  return (
    <Box sx={{ overflowY: "auto", flex: 1 }}>
      {items.map((item, itemIndex) => {
        const point = positions[item.start];
        const last = positions[item.end];
        const event = item.type.startsWith("ignition");
        const color =
          item.type === "moving"
            ? "#0A76C4"
            : item.type === "ignitionOn"
              ? "#2E7D32"
              : "#9E9E9E";
        const label = event
          ? item.type === "ignitionOn"
            ? "MOTOR ENCENDIDO"
            : "MOTOR APAGADO"
          : item.type === "moving"
            ? `En ruta · ${item.kilometers.toFixed(2)} km`
            : "Detenido";
        return (
          <Box
            key={`${item.start}-${item.type}-${itemIndex}`}
            onClick={() => onSelect(item.start)}
            sx={{
              borderLeft: `4px solid ${color}`,
              px: 1.5,
              py: 1,
              cursor: "pointer",
              borderBottom: "1px solid #EEF1F4",
            }}
          >
            <Box
              sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: event ? 700 : 500,
                  color: event ? "text.primary" : "text.secondary",
                }}
              >
                {label}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {event
                  ? formatTime(point.fixTime, "minutes")
                  : `${formatTime(point.fixTime, "minutes")} - ${formatTime(last.fixTime, "minutes")}`}
              </Typography>
            </Box>
            {!event && (
              <Typography variant="caption" color="text.secondary">
                {duration(point.fixTime, last.fixTime)}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default ReplayTimeline;
