import { useEffect, useMemo, useState } from "react";
import { CircularProgress, Paper, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import fetchOrThrow from "../../common/util/fetchOrThrow";
import { useTranslation } from "../../common/components/LocalizationProvider";

const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const dateKey = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const WeeklyChart = () => {
  const t = useTranslation();
  const devices = useSelector((state) => state.devices.items);
  const deviceIds = useMemo(() => Object.keys(devices), [devices]);
  const days = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      date.setHours(0, 0, 0, 0);
      return {
        date,
        key: dateKey(date),
        day: dayNames[date.getDay()],
        km: 0,
      };
    });
  }, []);
  const [data, setData] = useState(days);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const queue = [...deviceIds];
      const trips = [];
      const from = days[0].date.toISOString();
      const to = new Date().toISOString();
      const worker = async () => {
        while (queue.length) {
          const deviceId = queue.shift();
          const query = new URLSearchParams({
            deviceId,
            from,
            to,
          });
          const response = await fetchOrThrow(`/api/reports/trips?${query}`);
          const result = await response.json();
          console.log("Weekly trips:", deviceId, result);
          trips.push(...result);
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(5, queue.length) }, worker),
      );
      if (!cancelled) {
        let nextData = days.map((day) => ({
          ...day,
          km: trips
            .filter(
              (trip) =>
                dateKey(trip.startTime || trip.startTimeServer) === day.key,
            )
            .reduce((sum, trip) => sum + (trip.distance || 0) / 1000, 0),
        }));
        if (!nextData.some((day) => day.km > 0)) {
          const query = new URLSearchParams({ from, to, type: "deviceMoving" });
          const response = await fetchOrThrow(`/api/reports/events?${query}`);
          const events = await response.json();
          nextData = nextData.map((day) => ({
            ...day,
            km:
              events.filter(
                (event) =>
                  dateKey(event.eventTime || event.serverTime) === day.key,
              ).length * 0.1,
          }));
        }
        setData(nextData);
        setLoading(false);
      }
    };
    setLoading(true);
    load().catch(() => {
      if (!cancelled) {
        setData(days);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [days, deviceIds]);

  const hasActivity = data.some((item) => item.km > 0);
  return (
    <Paper sx={{ p: 2, height: 300 }}>
      <Typography variant="h6">{t("dashboardWeeklyActivity")}</Typography>
      {loading ? (
        <CircularProgress
          size={28}
          sx={{ display: "block", mx: "auto", mt: 10 }}
        />
      ) : hasActivity ? (
        <ResponsiveContainer width="100%" height="88%">
          <BarChart data={data}>
            <XAxis dataKey="day" />
            <YAxis unit=" km" />
            <Tooltip />
            <Bar dataKey="km" fill="#0A76C4" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Typography sx={{ textAlign: "center", mt: 10 }} color="text.secondary">
          {t("dashboardNoWeeklyActivity")}
        </Typography>
      )}
    </Paper>
  );
};

export default WeeklyChart;
