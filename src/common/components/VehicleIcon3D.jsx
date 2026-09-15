import sedan from "../assets/vehicles3d/sedan.svg?raw";
import suv from "../assets/vehicles3d/suv.svg?raw";
import pickup from "../assets/vehicles3d/pickup.svg?raw";
import van from "../assets/vehicles3d/van.svg?raw";
import truckLight from "../assets/vehicles3d/truck_light.svg?raw";
import truckHeavy from "../assets/vehicles3d/truck_heavy.svg?raw";
import bus from "../assets/vehicles3d/bus.svg?raw";
import motorcycle from "../assets/vehicles3d/motorcycle.svg?raw";
import bicycle from "../assets/vehicles3d/bicycle.svg?raw";
import person from "../assets/vehicles3d/person.svg?raw";

const icons = {
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
const dataUrl = (svg, color) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replaceAll("currentColor", color || "#0A76C4"))}`;

const VehicleIcon3D = ({ type, color = "#0A76C4", size = 40 }) => (
  <img
    src={dataUrl(icons[type] || sedan, color)}
    alt=""
    width={size}
    height={size}
    style={{ display: "block", objectFit: "contain", flexShrink: 0 }}
  />
);
export default VehicleIcon3D;
