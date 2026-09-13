import { mapIconKey, mapIcons } from "./preloadImages";

const models = import.meta.glob("../../resources/icons/vehicles/*.glb", {
  eager: true,
  query: "?url",
  import: "default",
});

export const loadVehicleModel = (category) => {
  const normalizedCategory = mapIconKey(category);
  const modelPath = `../../resources/icons/vehicles/${normalizedCategory}.glb`;
  const modelUrl = models[modelPath];
  if (modelUrl) {
    return { type: "3d", category: normalizedCategory, url: modelUrl };
  }
  return {
    type: "2d",
    category: normalizedCategory,
    url: mapIcons[normalizedCategory] || mapIcons.default,
  };
};

export default loadVehicleModel;
