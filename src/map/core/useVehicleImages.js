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
  car: sedan,
  suv,
  pickup,
  van,
  truck_light: truckLight,
  truck_heavy: truckHeavy,
  truck: truckLight,
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
export const svgToDataUrl = (svg, color) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replaceAll("currentColor", color))}`;

export default (map) => {
  useEffect(() => {
    const register = () =>
      Object.entries(svgs).forEach(([type, svg]) =>
        vehicleColors.forEach((color) => {
          const id = `vehicle-${type}-${color}`;
          if (map.hasImage(id)) return;
          const image = new Image(40, 40);
          image.onload = () => {
            if (!map.hasImage(id)) map.addImage(id, image, { sdf: false });
          };
          image.src = svgToDataUrl(svg, color);
        }),
      );
    map.on("style.load", register);
    register();
    return () => map.off("style.load", register);
  }, [map]);
};
