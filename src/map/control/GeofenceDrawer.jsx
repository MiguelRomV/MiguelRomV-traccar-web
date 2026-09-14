import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import CircleOutlinedIcon from "@mui/icons-material/CircleOutlined";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { map } from "../core/MapView";
import { geometryToArea } from "../core/mapUtil";
import drawTheme from "../draw/theme";
import { errorsActions, geofencesActions } from "../../store";
import fetchOrThrow from "../../common/util/fetchOrThrow";
import { useTranslation } from "../../common/components/LocalizationProvider";

MapboxDraw.constants.classes.CONTROL_BASE = "maplibregl-ctrl";
MapboxDraw.constants.classes.CONTROL_PREFIX = "maplibregl-ctrl-";
MapboxDraw.constants.classes.CONTROL_GROUP = "maplibregl-ctrl-group";

const GeofenceDrawer = ({ active, onClose }) => {
  const dispatch = useDispatch();
  const t = useTranslation();
  const groups = useSelector((state) => state.groups.items);
  const [feature, setFeature] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#0A76C4");
  const [groupId, setGroupId] = useState("");
  const [saving, setSaving] = useState(false);
  const [circleCenter, setCircleCenter] = useState(null);
  const [circleMode, setCircleMode] = useState(false);
  const draw = useMemo(
    () =>
      new MapboxDraw({
        displayControlsDefault: false,
        styles: drawTheme,
      }),
    [],
  );

  const cancel = () => {
    draw.deleteAll();
    setFeature(null);
    setName("");
    setCircleCenter(null);
    setCircleMode(false);
    onClose();
  };

  useEffect(() => {
    map.addControl(draw);
    return () => map.removeControl(draw);
  }, [draw]);

  useEffect(() => {
    if (active && !feature) {
      draw.changeMode("draw_polygon");
    } else if (!active) {
      draw.deleteAll();
      setFeature(null);
    }
  }, [active, draw, feature]);

  useEffect(() => {
    const sourceId = "vigilateh-circle-preview";
    const layerId = `${sourceId}-layer`;
    const circle = (center, edge) => {
      const radius = Math.hypot(edge.lng - center.lng, edge.lat - center.lat);
      return Array.from({ length: 65 }, (_, index) => {
        const angle = (index / 64) * Math.PI * 2;
        return [
          center.lng + Math.cos(angle) * radius,
          center.lat + Math.sin(angle) * radius,
        ];
      });
    };
    const update = (coordinates) => {
      const data = {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [coordinates] },
      };
      if (map.getSource(sourceId)) map.getSource(sourceId).setData(data);
      else {
        map.addSource(sourceId, { type: "geojson", data });
        map.addLayer({
          id: layerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": "#0A76C4",
            "fill-opacity": 0.2,
            "fill-outline-color": "#0A76C4",
          },
        });
      }
    };
    const clear = () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
    const click = (event) => {
      if (!active || !circleMode || feature) return;
      if (!circleCenter) {
        setCircleCenter(event.lngLat);
        return;
      }
      const id = draw.add({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [circle(circleCenter, event.lngLat)],
        },
      });
      setCircleCenter(null);
      setCircleMode(false);
      clear();
      setFeature(draw.get(id[0]));
    };
    const move = (event) => {
      if (circleCenter) update(circle(circleCenter, event.lngLat));
    };
    map.on("click", click);
    map.on("mousemove", move);
    return () => {
      map.off("click", click);
      map.off("mousemove", move);
      clear();
    };
  }, [active, circleCenter, circleMode, draw, feature]);

  useEffect(() => {
    const listener = (event) => setFeature(event.features[0]);
    map.on("draw.create", listener);
    return () => map.off("draw.create", listener);
  }, []);

  useEffect(() => {
    const listener = (event) => {
      if (event.key === "Escape" && active) cancel();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  });

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetchOrThrow("/api/geofences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          area: geometryToArea(feature.geometry),
          attributes: { color },
        }),
      });
      const item = await response.json();
      dispatch(geofencesActions.update([item]));
      if (groupId) {
        try {
          await fetchOrThrow("/api/permissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              groupId: Number(groupId),
              geofenceId: item.id,
            }),
          });
        } catch (error) {
          dispatch(errorsActions.push(error.message));
        }
      }
      cancel();
    } catch (error) {
      dispatch(errorsActions.push(error.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {active && !feature && (
        <>
          <Button
            variant={circleMode ? "contained" : "outlined"}
            startIcon={<CircleOutlinedIcon />}
            onClick={() => {
              setCircleMode((value) => !value);
              setCircleCenter(null);
              draw.changeMode("simple_select");
            }}
            sx={{ position: "fixed", right: 56, top: 40, zIndex: 3 }}
          >
            Círculo
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={cancel}
            sx={{ position: "fixed", right: 56, top: 88, zIndex: 3 }}
          >
            {t("sharedCancel")}
          </Button>
        </>
      )}
      <Dialog open={Boolean(feature)} onClose={cancel} fullWidth maxWidth="xs">
        <DialogTitle>{t("mapGeofenceDetails")}</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
        >
          <TextField
            autoFocus
            required
            label={t("sharedName")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            type="color"
            label={t("mapGeofenceColor")}
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
          <FormControl>
            <InputLabel>{t("groupDialog")}</InputLabel>
            <Select
              value={groupId}
              label={t("groupDialog")}
              onChange={(event) => setGroupId(event.target.value)}
            >
              <MenuItem value="">{t("mapGeofenceNoGroup")}</MenuItem>
              {Object.values(groups).map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancel}>{t("sharedCancel")}</Button>
          <Button
            disabled={!name.trim() || saving}
            onClick={save}
            variant="contained"
          >
            {t("sharedSave")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GeofenceDrawer;
