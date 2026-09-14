import { Box } from "@mui/material";
import { useSelector } from "react-redux";
import MapView from "../../map/core/MapView";
import MapPositionMarkers from "../../map/MapPositionMarkers";
import MapCamera from "../../map/MapCamera";

const MiniFleetMap = () => {
  const positions = Object.values(
    useSelector((state) => state.session.positions),
  );

  return (
    <Box
      sx={{
        height: 400,
        borderRadius: 2,
        border: "1px solid #e0e0e0",
        overflow: "hidden",
      }}
    >
      <MapView>
        <MapPositionMarkers
          positions={positions}
          showStatus
          showTitles={false}
        />
        <MapCamera positions={positions} />
      </MapView>
    </Box>
  );
};

export default MiniFleetMap;
