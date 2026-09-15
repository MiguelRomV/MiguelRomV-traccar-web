import { useEffect } from "react";
import sedan from "../../common/assets/vehicles3d/sedan.svg?raw";
import suv from "../../common/assets/vehicles3d/suv.svg?raw";
import pickup from "../../common/assets/vehicles3d/pickup.svg?raw";
import van from "../../common/assets/vehicles3d/van.svg?raw";
import truckLight from "../../common/assets/vehicles3d/truck_light.svg?raw";
import truckHeavy from "../../common/assets/vehicles3d/truck_heavy.svg?raw";
import bus from "../../common/assets/vehicles3d/bus.svg?raw";
import motorcycle from "../../common/assets/vehicles3d/motorcycle.svg?raw";
import bicycle from "../../common/assets/vehicles3d/bicycle.svg?raw";
import person from "../../common/assets/vehicles3d/person.svg?raw";

const svgs = {
  sedan,
  suv,
  pickup,
  van,
  truck_light: truckLight,
  truck_heavy: truckHeavy,
  bus,
  motorcycle,
  bicycle,
  person,
};
export const vehicleColors = [
  "#0A76C4",
  "#E53935",
  "#43A047",
  "#FB8C00",
  "#8E24AA",
  "#212121",
  "#FFFFFF",
];
export const normalizeVehicleColor = (color = "#0A76C4") =>
  color.startsWith("#") ? color : `#${color}`;
export const vehicleColorSafe = (color) =>
  normalizeVehicleColor(color).slice(1).toUpperCase();
export const svgToDataUrl = (svg, color) => {
  const normalized = normalizeVehicleColor(color);
  const sized = /<svg[^>]*\bwidth=/.test(svg)
    ? svg
    : svg.replace("<svg ", '<svg width="64" height="64" ');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized.replaceAll("currentColor", normalized))}`;
};

export default (map) => {
  useEffect(() => {
    const register = () =>
      Object.entries(svgs).forEach(([type, svg]) =>
        vehicleColors.forEach((color) => {
          const colorSafe = vehicleColorSafe(color);
          const id = `vehicle-${type}-${colorSafe}`;
          if (map.hasImage(id)) return;
          const dataURL = svgToDataUrl(svg, color);
          const image = new Image(64, 64);
          image.onload = () => {
            if (!map.hasImage(id)) {
              map.addImage(id, image, { sdf: false });
              console.log(
                "SVG registrado:",
                id,
                "dataURL len:",
                dataURL.length,
              );
            }
          };
          image.src = dataURL;
        }),
      );
    map.on("style.load", register);
    register();
    return () => map.off("style.load", register);
  }, [map]);
};
