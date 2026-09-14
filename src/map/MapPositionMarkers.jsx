import { useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { map } from "./core/MapView";
import MapMarkers from "./MapMarkers";
import {
  formatSpeed,
  formatTime,
  getStatusColor,
} from "../common/util/formatter";
import { mapIconKey } from "./core/preloadImages";
import { useAttributePreference } from "../common/util/preferences";
import { fromMapCoordinates } from "./core/mapUtil";
import { useTranslation } from "../common/components/LocalizationProvider";

const MapPositionMarkers = ({
  positions,
  onMapClick,
  onMarkerClick,
  showStatus,
  selectedPosition,
  titleField,
  disabled,
  showTitles = true,
}) => {
  const t = useTranslation();
  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const mapCluster = useAttributePreference("mapCluster", true);
  const directionType = useAttributePreference("mapDirection", "selected");
  const speedUnit = useAttributePreference("speedUnit", "kmh");

  const onMapClickCallback = useCallback(
    (event) => {
      if (!event.defaultPrevented && onMapClick) {
        const [longitude, latitude] = fromMapCoordinates(
          event.lngLat.lng,
          event.lngLat.lat,
        );
        onMapClick(latitude, longitude);
      }
    },
    [onMapClick],
  );

  useEffect(() => {
    map.on("click", onMapClickCallback);
    return () => map.off("click", onMapClickCallback);
  }, [onMapClickCallback]);

  const buildMarker = (position) => {
    const device = devices[position.deviceId];
    let showDirection;
    switch (directionType) {
      case "none":
        showDirection = false;
        break;
      case "all":
        showDirection = position.course > 0;
        break;
      default:
        showDirection =
          selectedPosition?.id === position.id && position.course > 0;
        break;
    }
    const color = showStatus
      ? position.attributes.color || getStatusColor(device.status)
      : "neutral";
    const titles = {
      name: device.name,
      fixTime: formatTime(position.fixTime, "seconds"),
      speed:
        position.speed > 0
          ? formatSpeed(position.speed, speedUnit, t)
          : device.name,
    };
    return {
      id: position.id,
      deviceId: position.deviceId,
      latitude: position.latitude,
      longitude: position.longitude,
      image: `${mapIconKey(device.category)}-${color}`,
      title: titles[titleField || "name"],
      rotation: position.course,
      direction: showDirection,
      opacity: position.markerOpacity ?? 1,
    };
  };

  const markers = positions
    .filter((it) => devices.hasOwnProperty(it.deviceId))
    .map(buildMarker);

  const onClick = useCallback(
    (properties) => onMarkerClick?.(properties.id, properties.deviceId),
    [onMarkerClick],
  );

  return (
    <>
      <MapMarkers
        markers={markers.filter((it) => it.deviceId !== selectedDeviceId)}
        showTitles={showTitles}
        direction
        cluster={mapCluster}
        onClick={onClick}
        disabled={disabled}
      />
      <MapMarkers
        markers={markers.filter((it) => it.deviceId === selectedDeviceId)}
        showTitles={showTitles}
        direction
        onClick={onClick}
        disabled={disabled}
      />
    </>
  );
};

export default MapPositionMarkers;
