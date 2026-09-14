import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { IconButton, Paper, Tooltip } from "@mui/material";
import MouseIcon from "@mui/icons-material/Mouse";
import PanToolIcon from "@mui/icons-material/PanTool";
import PlaceIcon from "@mui/icons-material/Place";
import TimelineIcon from "@mui/icons-material/Timeline";
import PentagonIcon from "@mui/icons-material/Pentagon";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useMemo, useState } from "react";
import { map } from "../../map/core/MapView";
import drawTheme from "../../map/draw/theme";

MapboxDraw.constants.classes.CONTROL_BASE = "maplibregl-ctrl";
MapboxDraw.constants.classes.CONTROL_PREFIX = "maplibregl-ctrl-";
MapboxDraw.constants.classes.CONTROL_GROUP = "maplibregl-ctrl-group";

const ReplayDrawToolbar = () => {
  const [open, setOpen] = useState(false);
  const draw = useMemo(
    () => new MapboxDraw({ displayControlsDefault: false, styles: drawTheme }),
    [],
  );

  useEffect(() => {
    if (open) map.addControl(draw);
    return () => {
      if (map.hasControl(draw)) map.removeControl(draw);
    };
  }, [draw, open]);

  const edit = () => {
    const id = draw.getSelectedIds()[0] || draw.getAll().features[0]?.id;
    if (id) draw.changeMode("direct_select", { featureId: id });
  };
  const actions = [
    ["Selección", MouseIcon, () => draw.changeMode("simple_select")],
    [
      "Mover",
      PanToolIcon,
      () => {
        draw.changeMode("simple_select");
        map.dragPan.enable();
      },
    ],
    ["Marcador", PlaceIcon, () => draw.changeMode("draw_point")],
    ["Línea", TimelineIcon, () => draw.changeMode("draw_line_string")],
    ["Polígono", PentagonIcon, () => draw.changeMode("draw_polygon")],
    ["Edición", EditIcon, edit],
    ["Borrar", DeleteIcon, () => draw.trash()],
    ["Cerrar", CloseIcon, () => setOpen(false)],
  ];

  if (!open) {
    return (
      <Tooltip title="Herramientas de dibujo">
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            top: 12,
            left: "50%",
            zIndex: 4,
            bgcolor: "background.paper",
          }}
        >
          <EditIcon />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Paper
      elevation={4}
      sx={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 4,
        display: "flex",
      }}
    >
      {actions.map(([title, Icon, action]) => (
        <Tooltip key={title} title={title}>
          <IconButton onClick={action}>
            <Icon />
          </IconButton>
        </Tooltip>
      ))}
    </Paper>
  );
};

export default ReplayDrawToolbar;
