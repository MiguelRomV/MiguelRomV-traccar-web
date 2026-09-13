import { useMemo } from "react";
import { useAttributePreference } from "../../common/util/preferences";
import useMapLayer from "../core/useMapLayer";
import useMapOverlays from "./useMapOverlays";

const MapOverlayLayer = ({ overlay }) => {
  useMapLayer({
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

  return null;
};

const MapOverlay = ({ forcedIds = [] }) => {
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
    <MapOverlayLayer key={overlay.id} overlay={overlay} />
  ));
};

export default MapOverlay;
