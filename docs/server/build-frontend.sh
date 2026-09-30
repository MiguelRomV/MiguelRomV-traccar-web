#!/usr/bin/env bash
# Este script únicamente imprime el plan. No ejecuta build, SSH ni deploy.
cat <<'COMMANDS'
REVISAR ANTES DE CORRER — FASE D/E

# Ventana 2 — Git Bash LOCAL; directorio /c/Users/Miguel/vigilateh-web/traccar-web
cd /c/Users/Miguel/vigilateh-web/traccar-web
npm ci && npm run build
# Continuar únicamente si el build terminó OK y existe build/index.html.
test -f build/index.html

# Ventana 4 — Git Bash LOCAL; mismo directorio
ssh vigilateh-oracle 'mkdir -p /tmp/web-new && test -z "$(ls -A /tmp/web-new)"'
# Si staging NO está vacío, detenerse: no mezclar con una versión anterior.
scp -r build/* vigilateh-oracle:/tmp/web-new/
ssh vigilateh-oracle

# Ventana 4 — sesión SSH; directorio /opt/traccar
cd /opt/traccar
sudo test -f /tmp/web-new/index.html
WEB_BACKUP="/opt/traccar/web.bak-$(date +%Y%m%d-%H%M%S)"
sudo cp -a /opt/traccar/web "$WEB_BACKUP" && printf 'WEB_BACKUP=%s\n' "$WEB_BACKUP"
# Anotar WEB_BACKUP. Si falla cualquier comando, detenerse.
WEB_OWNER=$(stat -c '%u:%g' /opt/traccar/web)
sudo rsync -an --delete --chown="$WEB_OWNER" /tmp/web-new/ /opt/traccar/web/
# Revisar dry-run antes de aplicar.
sudo rsync -a --delete --chown="$WEB_OWNER" /tmp/web-new/ /opt/traccar/web/
namei -l /opt/traccar/web/index.html
stat -c '%a %U:%G %n' /opt/traccar/web /opt/traccar/web/index.html
# Verificar que Traccar puede leer los archivos y atravesar sus directorios.
sudo systemctl restart traccar
systemctl is-active traccar
exit

# Ventana 1 — Git Bash LOCAL; directorio /c/Users/Miguel/vigilateh-web/traccar-web
curl -sS -o /dev/null -w 'web:%{http_code}\n' https://vigilateh.duckdns.org/
curl -sS -o /dev/null -w 'crm:%{http_code}\n' https://vigilateh.duckdns.org/api/crm/clients
# Esperado: web:200 y crm:401 sin sesión.
# Navegador: login, mapa, /crm y GET /api/crm/clients=200 con sesión.
COMMANDS
