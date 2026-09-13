import { useEffect, useMemo } from "react";
import { map } from "../core/MapView";
import { useAttributePreference } from "../../common/util/preferences";
import useMapLayer from "../core/useMapLayer";
import useMapOverlays from "./useMapOverlays";

const MapOverlayLayer = ({ overlay, onAuthError }) => {
  const sourceId = useMapLayer({
    source: overlay.source,
    layers: [
      {
        type: "raster",
        metadata: { "traccar:title": overlay.title },
        layout: {
          visibility: "visible",
        },
      },
    ],
    layersDeps: [overlay],
  });

  useEffect(() => {
    const listener = (event) => {
      const message = String(event.error?.message || event.error || "");
      if (event.sourceId === sourceId && /401|403/.test(message)) {
        console.warn("TomTom traffic tiles rejected the configured API key");
        onAuthError?.();
      }
    };
    map.on("error", listener);
    return () => map.off("error", listener);
  }, [onAuthError, sourceId]);

  return null;
};

const MapOverlay = ({ forcedIds = [], onOverlayAuthError }) => {
  const mapOverlays = useMapOverlays();
  const selectedMapOverlay = useAttributePreference("selectedMapOverlay");

  const activeOverlays = useMemo(() => {
    const selectedIds = selectedMapOverlay ? selectedMapOverlay.split(",") : [];
    const activeIds = new Set([...selectedIds, ...forcedIds]);
    return mapOverlays
      .filter((overlay) => overlay.available)
      .filter((overlay) => activeIds.has(overlay.id));
  }, [mapOverlays, selectedMapOverlay, forcedIds]);

  return activeOverlays.map((overlay) => (
    <MapOverlayLayer
      key={overlay.id}
      overlay={overlay}
      onAuthError={onOverlayAuthError}
    />
  ));
};

export default MapOverlay;
