import { useEffect, useState } from "react";
import { Alert, CircularProgress, Typography } from "@mui/material";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "./LocalizationProvider";
import { useAttributePreference } from "../util/preferences";
import { speedFromKnots, speedUnitString } from "../util/converter";
import fetchOrThrow from "../util/fetchOrThrow";

const SpeedChart = ({ deviceId }) => {
  const t = useTranslation();
  const speedUnit = useAttributePreference("speedUnit", "kmh");
  const [state, setState] = useState({ loading: true, error: false, data: [] });

  useEffect(() => {
    const controller = new AbortController();
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    setState({ loading: true, error: false, data: [] });

    const search = new URLSearchParams({
      deviceId: String(deviceId),
      from: from.toISOString(),
      to: to.toISOString(),
    });

    fetchOrThrow(`/api/positions?${search}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((positions) => {
        setState({
          loading: false,
          error: false,
          data: positions.map((position) => ({
            time: new Date(position.fixTime).getTime(),
            speed: speedFromKnots(position.speed || 0, speedUnit),
          })),
        });
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setState({ loading: false, error: true, data: [] });
        }
      });

    return () => controller.abort();
  }, [deviceId, speedUnit]);

  if (state.loading) {
    return <CircularProgress size={24} />;
  }

  if (state.error) {
    return <Alert severity="error">{t("statusChartLoadError")}</Alert>;
  }

  if (!state.data.length) {
    return (
      <Typography color="textSecondary">{t("statusChartNoData")}</Typography>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={210}>
      <LineChart
        data={state.data}
        margin={{ top: 12, right: 16, bottom: 4, left: 0 }}
      >
        <XAxis
          dataKey="time"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(value) =>
            new Date(value).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          }
        />
        <YAxis unit={` ${speedUnitString(speedUnit, t)}`} width={58} />
        <Tooltip
          labelFormatter={(value) => new Date(value).toLocaleString()}
          formatter={(value) => [
            `${value} ${speedUnitString(speedUnit, t)}`,
            t("statusChartSpeed"),
          ]}
        />
        <Line
          type="monotone"
          dataKey="speed"
          stroke="#039BE5"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SpeedChart;
