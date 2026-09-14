import { useEffect, useMemo, useState } from "react";
import { Paper, Typography } from "@mui/material";
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

const WeeklyChart = () => {
  const t = useTranslation();
  const devices = useSelector((state) => state.devices.items);
  const deviceIds = useMemo(() => Object.keys(devices), [devices]);
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - 6 + index);
      date.setHours(0, 0, 0, 0);
      return {
        date,
        key: date.toISOString().slice(0, 10),
        day: dayNames[date.getDay()],
        km: 0,
      };
    });
  }, []);
  const [data, setData] = useState(days);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const queue = [...deviceIds];
      const trips = [];
      const from = days[0].date.toISOString();
      const toDate = new Date(days[6].date);
      toDate.setDate(toDate.getDate() + 1);
      const worker = async () => {
        while (queue.length) {
          const deviceId = queue.shift();
          const query = new URLSearchParams({
            deviceId,
            from,
            to: toDate.toISOString(),
          });
          const response = await fetchOrThrow(`/api/reports/trips?${query}`);
          trips.push(...(await response.json()));
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(5, queue.length) }, worker),
      );
      if (!cancelled) {
        setData(
          days.map((day) => ({
            ...day,
            km: trips
              .filter(
                (trip) =>
                  (trip.startTime || trip.startTimeServer)?.slice(0, 10) ===
                  day.key,
              )
              .reduce((sum, trip) => sum + (trip.distance || 0) / 1000, 0),
          })),
        );
      }
    };
    load().catch(() => !cancelled && setData(days));
    return () => {
      cancelled = true;
    };
  }, [days, deviceIds]);

  const hasActivity = data.some((item) => item.km > 0);
  return (
    <Paper sx={{ p: 2, height: 300 }}>
      <Typography variant="h6">{t("dashboardWeeklyActivity")}</Typography>
      {hasActivity ? (
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
