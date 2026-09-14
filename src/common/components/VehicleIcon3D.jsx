import sedan from "../assets/vehicles3d/sedan.svg";
import suv from "../assets/vehicles3d/suv.svg";
import pickup from "../assets/vehicles3d/pickup.svg";
import van from "../assets/vehicles3d/van.svg";
import truckLight from "../assets/vehicles3d/truck_light.svg";
import truckHeavy from "../assets/vehicles3d/truck_heavy.svg";
import bus from "../assets/vehicles3d/bus.svg";
import motorcycle from "../assets/vehicles3d/motorcycle.svg";
import bicycle from "../assets/vehicles3d/bicycle.svg";
import person from "../assets/vehicles3d/person.svg";

const icons = {
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
const VehicleIcon3D = ({ type, color = "#0A76C4", size = 32 }) => (
  <span
    aria-hidden="true"
    style={{
      display: "inline-block",
      width: size,
      height: size,
      flexShrink: 0,
      backgroundColor: color,
      mask: `url(${icons[type] || sedan}) center / contain no-repeat`,
    }}
  />
);
export default VehicleIcon3D;
