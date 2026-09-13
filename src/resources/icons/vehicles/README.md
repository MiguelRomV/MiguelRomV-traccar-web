# Modelos 3D de vehículos VigilaTeh

Esta carpeta está preparada para modelos GLB opcionales. Mientras un modelo no exista, `vehicleModelLoader.js` devuelve automáticamente el SVG 2D equivalente y la interfaz actual continúa funcionando sin Three.js.

## Nombres exactos

- `car.glb`
- `truck.glb`
- `motorcycle.glb`
- `bus.glb`
- `person.glb`

Las categorías `pickup` y `offroad` reutilizan `car.glb`; `trolleybus` reutiliza `bus.glb`. Las demás categorías conservan su SVG hasta que se agregue un modelo con el nombre normalizado correspondiente.

## Preparación de assets

- Unidad y escala: metros, con el objeto a escala real y transformaciones aplicadas antes de exportar.
- Origen: centro del vehículo a nivel del suelo (`0, 0, 0`).
- Orientación: eje longitudinal apuntando hacia `+Y`, techo hacia `+Z`.
- Complejidad: idealmente 5 000–15 000 triángulos por modelo; máximo recomendado 25 000.
- Materiales: uno o dos materiales PBR, texturas de hasta 1024×1024, comprimidas cuando sea posible.
- Formato: GLB binario, sin cámaras, luces, animaciones ni geometría oculta innecesaria.

## Activación futura

Cuando existan assets aprobados, se puede integrar el resultado de `loadVehicleModel(category)` en una capa WebGL personalizada de MapLibre. Instalar `three` (y `@react-three/fiber` solo si se renderiza fuera de MapLibre) en ese momento; no se incluyen ahora para evitar aumentar el bundle sin utilidad visible.
