import { Box, ButtonBase, Typography } from "@mui/material";
import VehicleIcon3D from "../../common/components/VehicleIcon3D";
import { useTranslation } from "../../common/components/LocalizationProvider";

const types = [
  "sedan",
  "suv",
  "pickup",
  "van",
  "truck_light",
  "truck_heavy",
  "bus",
  "motorcycle",
  "bicycle",
  "person",
];
const colors = [
  "#0A76C4",
  "#E53935",
  "#43A047",
  "#FB8C00",
  "#8E24AA",
  "#212121",
  "#FFFFFF",
];
const labels = {
  sedan: "vehicleTypeSedan",
  suv: "vehicleTypeSuv",
  pickup: "vehicleTypePickup",
  van: "vehicleTypeVan",
  truck_light: "vehicleTypeTruckLight",
  truck_heavy: "vehicleTypeTruckHeavy",
  bus: "vehicleTypeBus",
  motorcycle: "vehicleTypeMotorcycle",
  bicycle: "vehicleTypeBicycle",
  person: "vehicleTypePerson",
};

const VehicleTypeSelector = ({
  value = "sedan",
  color = "#0A76C4",
  onChange,
}) => {
  const t = useTranslation();
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {t("vehicleTypeTitle")}
      </Typography>
      <Box
        sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1 }}
      >
        {types.map((type) => (
          <ButtonBase
            key={type}
            onClick={() => onChange({ type, color })}
            sx={{
              display: "flex",
              flexDirection: "column",
              p: 1,
              border: value === type ? "3px solid #0A76C4" : "1px solid #ddd",
              borderRadius: 1,
            }}
          >
            <VehicleIcon3D type={type} color={color} size={48} />
            <Typography variant="caption">{t(labels[type])}</Typography>
          </ButtonBase>
        ))}
      </Box>
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        {t("sharedColor")}
      </Typography>
      <Box sx={{ display: "flex", gap: 1 }}>
        {colors.map((nextColor) => (
          <ButtonBase
            key={nextColor}
            aria-label={nextColor}
            onClick={() => onChange({ type: value, color: nextColor })}
            sx={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              bgcolor: nextColor,
              border:
                color === nextColor ? "3px solid #0A76C4" : "1px solid #999",
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default VehicleTypeSelector;
