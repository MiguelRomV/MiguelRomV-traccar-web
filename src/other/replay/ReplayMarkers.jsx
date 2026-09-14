import * as maplibregl from "maplibre-gl";
import { useMemo } from "react";
import useMapLayer from "../../map/core/useMapLayer";
import { toMapCoordinates } from "../../map/core/mapUtil";
import { map } from "../../map/core/MapView";

const ReplayMarkers = ({ positions, events }) => {
  const features = useMemo(() => {
    if (!positions.length) return [];
    const result = [];
    const add = (position, type, label, color, details) =>
      result.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: toMapCoordinates(position.longitude, position.latitude),
        },
        properties: {
          type,
          label,
          color,
          time: new Date(position.fixTime).toLocaleString(),
          details,
        },
      });
    add(positions[0], "start", "▶", "#2E7D32", "Inicio");
    positions.forEach((position, index) => {
      if (
        position.speed === 0 &&
        (index === 0 || positions[index - 1].speed > 0)
      ) {
        add(position, "stop", "P", "#0A76C4", "Detenido");
      }
      if (position.attributes?.alarm) {
        add(position, "alarm", "!", "#E53935", position.attributes.alarm);
      }
    });
    events.forEach((event) => {
      const time = Date.parse(event.eventTime || event.serverTime);
      const position = positions.reduce((best, candidate) =>
        Math.abs(Date.parse(candidate.fixTime) - time) <
        Math.abs(Date.parse(best.fixTime) - time)
          ? candidate
          : best,
      );
      add(position, "alarm", "!", "#E53935", event.type);
    });
    return result;
  }, [events, positions]);

  useMapLayer({
    layers: [
      {
        key: "circle",
        type: "circle",
        paint: {
          "circle-radius": 11,
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 2,
        },
      },
      {
        key: "label",
        type: "symbol",
        layout: { "text-field": ["get", "label"], "text-size": 12 },
        paint: { "text-color": "#FFFFFF" },
        on: {
          click: (event) => {
            const feature = event.features[0];
            const content = document.createElement("div");
            content.textContent = `${feature.properties.details} · ${feature.properties.time}`;
            new maplibregl.Popup()
              .setLngLat(event.lngLat)
              .setDOMContent(content)
              .addTo(map);
          },
        },
      },
    ],
    layersDeps: [],
    data: { type: "FeatureCollection", features },
    dataDeps: [features],
  });

  return null;
};

export default ReplayMarkers;
