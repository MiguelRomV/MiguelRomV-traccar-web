# Limpieza manual de backups en servidor — 2026-09-22

Codex no tiene SSH y no ejecutó ni ejecutará comandos en el servidor. Revisar primero las rutas y listados; no borrar hasta confirmar que los backups conservados existen y son válidos.

## Inventario disponible

El handoff de Sesión 15 solo especifica estos datos; no contiene nombres completos ni rutas para cada archivo:

- `traccar.xml.bak-*`: conservar el más reciente y retirar los demás.
- `/opt/vigilateh-whatsapp/docker-compose.yml.bak-20260922-215305`: conservar este backup y retirar otros `docker-compose.yml.bak-*` de esa carpeta.
- `web.bak.*`: el handoff indica que hay cinco y pide conservar los tres más recientes.
- La ubicación exacta de `traccar.xml.bak-*` y `web.bak.*` no está especificada. Localizar e inspeccionar antes de usar cualquier comando de borrado.

## Inspección previa por SSH

```bash
sudo find /opt -type f \( -name 'traccar.xml.bak-*' -o -name 'web.bak.*' -o -name 'docker-compose.yml.bak-*' \) -printf '%TY-%Tm-%Td %TH:%TM:%TS %p\n' | sort -r
sudo ls -l /opt/vigilateh-whatsapp/docker-compose.yml.bak-20260922-215305
```

Verificar manualmente que las rutas objetivo y el backup retenido son los esperados. Para XML, tomar como referencia el backup más reciente por fecha de modificación dentro de la carpeta real encontrada. Para `web.bak.*`, confirmar nombres y conservar los tres más recientes.

## Borrado manual (solo después de revisar el listado)

En la carpeta real de `traccar.xml.bak-*`, conservar el más nuevo y borrar el resto:

```bash
cd /RUTA/CONFIRMADA
mapfile -t files < <(find . -maxdepth 1 -type f -name 'traccar.xml.bak-*' -printf '%T@ %p\n' | sort -rn | awk 'NR>1 {sub(/^[^ ]+ /, ""); print}')
printf '%s\n' "${files[@]}"   # revisar antes de borrar
# Solo tras confirmar esa lista:
# printf '%s\0' "${files[@]}" | xargs -0 -r rm --
```

En `/opt/vigilateh-whatsapp`, conservar el backup indicado y retirar el resto, tras validar el preview:

```bash
cd /opt/vigilateh-whatsapp
find . -maxdepth 1 -type f -name 'docker-compose.yml.bak-*' ! -name 'docker-compose.yml.bak-20260922-215305' -print
# Solo tras confirmar que el backup a conservar existe y el preview es correcto:
# find . -maxdepth 1 -type f -name 'docker-compose.yml.bak-*' ! -name 'docker-compose.yml.bak-20260922-215305' -delete
```

En la carpeta real de `web.bak.*`, conservar los tres más nuevos y revisar antes de borrar los restantes:

```bash
cd /RUTA/CONFIRMADA
mapfile -t files < <(find . -maxdepth 1 -type f -name 'web.bak.*' -printf '%T@ %p\n' | sort -rn | awk 'NR>3 {sub(/^[^ ]+ /, ""); print}')
printf '%s\n' "${files[@]}"   # revisar antes de borrar
# Solo tras confirmar esa lista:
# printf '%s\0' "${files[@]}" | xargs -0 -r rm --
```

Al terminar, volver a listar los tres grupos y confirmar que quedan: un backup `traccar.xml`, el `docker-compose.yml.bak-20260922-215305` y tres `web.bak.*`.

## `.gitignore`

El repositorio incluye ahora las reglas `*.bak-*` y `HANDOFF*.txt`.
