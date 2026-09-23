# Deploy CRM — Sesión 15

Destino: `https://vigilateh.duckdns.org` · rama `vigilateh-custom` · ejecución manual por Miguel.

El frontend de este repo se genera en `build/` (`vite.config.js`), no en `dist/`. Build local verificado el 2026-09-23: 526 archivos, 12,035,241 bytes (11.48 MiB). Conserva los valores de `BACKUP_DIR` y `STAGING_DIR` que se imprimen en la fase D: sirven para rollback. No copies el `.env` local al servidor.

## FASE A — Push a origin (Git Bash local)

```bash
cd /c/Users/Miguel/vigilateh-web/traccar-web
git status --short
git push origin vigilateh-custom
```

Ejecutar el push solo cuando el manual ya esté commiteado y `git status --short` no muestre cambios.

## FASE B — Sidecar CRM en servidor

Desde Git Bash local, crear el destino y copiar solo los archivos de ejecución (sin `.env` ni `node_modules`):

```bash
cd /c/Users/Miguel/vigilateh-web/traccar-web
ssh vigilateh-oracle 'sudo mkdir -p /opt/vigilateh-whatsapp/crm-api/migrations && sudo chown -R "$(id -un):$(id -gn)" /opt/vigilateh-whatsapp/crm-api'
scp deploy/crm-api/{Dockerfile,package.json,package-lock.json,server.js} vigilateh-oracle:/opt/vigilateh-whatsapp/crm-api/
scp deploy/crm-api/migrations/*.sql vigilateh-oracle:/opt/vigilateh-whatsapp/crm-api/migrations/
```

Entrar al servidor y crear `/opt/vigilateh-whatsapp/crm-api/.env` con permisos privados. Al pedir `DATABASE_URL`, pegar la URL completa y vigente de PostgreSQL; al pedir `EVOLUTION_API_KEY`, pegar la clave vigente. La entrada no aparece en pantalla ni en el historial del shell.

```bash
ssh vigilateh-oracle
cd /opt/vigilateh-whatsapp/crm-api
umask 077
read -rsp 'DATABASE_URL completa: ' CRM_DATABASE_URL; printf '\n'
read -rsp 'EVOLUTION_API_KEY: ' CRM_EVOLUTION_API_KEY; printf '\n'
printf '%s\n' \
  'PORT=8090' \
  "DATABASE_URL=$CRM_DATABASE_URL" \
  'TRACCAR_URL=http://127.0.0.1:8082' \
  'CORS_ORIGIN=https://vigilateh.duckdns.org' \
  'EVOLUTION_URL=http://127.0.0.1:8080' \
  "EVOLUTION_API_KEY=$CRM_EVOLUTION_API_KEY" \
  'EVOLUTION_INSTANCE=vigilateh' > .env
unset CRM_DATABASE_URL CRM_EVOLUTION_API_KEY
chmod 600 .env
exit
```

`EVOLUTION_INSTANCE` queda documentada en el `.env`; el sidecar actual fija `vigilateh` en `server.js`. El `Dockerfile` actual usa `npm install --omit=dev` y no `npm ci`; la build Docker debe tener acceso a npm.

En el servidor, respaldar el compose y agregar este servicio debajo de `services:` en `/opt/vigilateh-whatsapp/docker-compose.yml`:

```bash
ssh vigilateh-oracle
cd /opt/vigilateh-whatsapp
sudo cp -a docker-compose.yml "docker-compose.yml.bak-$(date +%Y%m%d-%H%M%S)"
sudoedit docker-compose.yml
```

```yaml
  crm-api:
    build: /opt/vigilateh-whatsapp/crm-api
    restart: unless-stopped
    network_mode: host
    env_file:
      - /opt/vigilateh-whatsapp/crm-api/.env
```

Validar y levantar el servicio:

```bash
docker compose config -q
docker compose up -d --build crm-api
docker compose logs --tail 30 crm-api
curl -s -o /dev/null -w 'crm interno:%{http_code}\n' http://127.0.0.1:8090/api/crm/clients
exit
```

Esperado: `CRM API listening on 8090` y `crm interno:401` (sin cookie). El arranque aplica las migraciones idempotentes `001` y `002`. Si falla, revisar logs y no avanzar al proxy.

## FASE C — Proxy `/api/crm/*` (identificar servicio real antes de editar)

En el servidor, identificar qué atiende HTTPS y dónde está el bloque de `vigilateh.duckdns.org`:

```bash
ssh vigilateh-oracle
sudo ss -lntp | grep ':443'
sudo nginx -T 2>/dev/null | grep -B 4 -A 12 'server_name.*vigilateh.duckdns.org'
sudo nginx -T 2>/dev/null | grep -B 2 -A 6 'location .*api'
grep -i proxy /opt/traccar/conf/traccar.xml 2>/dev/null || true
head -40 /opt/traccar/docker-compose.yml 2>/dev/null || true
```

Si Nginx atiende ese dominio, agregar **dentro del `server` HTTPS activo** esta regla exacta, antes de probar el frontend. No poner `/` al final de `proxy_pass`: el sidecar necesita recibir `/api/crm/...` intacto.

```nginx
location ^~ /api/crm/ {
    proxy_pass http://127.0.0.1:8090;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Cookie $http_cookie;
}
```

Editar únicamente el archivo de configuración activo identificado por `sudo nginx -T`. Después:

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -s -o /dev/null -w 'crm público:%{http_code}\n' https://vigilateh.duckdns.org/api/crm/clients
```

Esperado: `crm público:401`. Si `ss` muestra otro proxy, `nginx -T` no identifica ese dominio, o la prueba pública no devuelve 401, **detener el deploy aquí** y pasarle a Codex la salida de los comandos de inspección. Sin acceso SSH no se puede fijar de antemano el archivo de configuración ni la regla equivalente para otro proxy.

## FASE D — Deploy frontend

Primero confirmar el gestor de Traccar; los comandos siguientes asumen servicio systemd activo:

```bash
ssh vigilateh-oracle 'systemctl is-active traccar'
```

Debe imprimir `active`. Si Traccar corre en contenedor u otro gestor, detenerse y sustituir el comando de reinicio antes del swap.

En la **misma sesión de Git Bash local**, guardar la ruta del backup y crear un staging remoto único:

```bash
cd /c/Users/Miguel/vigilateh-web/traccar-web
BACKUP_DIR=$(ssh vigilateh-oracle 'stamp=$(date +%Y%m%d-%H%M%S); backup="/opt/traccar/web.bak-$stamp"; sudo cp -a /opt/traccar/web "$backup" && printf "%s" "$backup"')
test -n "$BACKUP_DIR" && printf 'BACKUP_DIR=%s\n' "$BACKUP_DIR"
STAGING_DIR=$(ssh vigilateh-oracle 'mktemp -d /tmp/vigilateh-web-s15.XXXXXX')
test -n "$STAGING_DIR" && printf 'STAGING_DIR=%s\n' "$STAGING_DIR"
scp -r build/. "vigilateh-oracle:${STAGING_DIR}/"
ssh vigilateh-oracle "test -f '${STAGING_DIR}/index.html' && sudo rsync -an --delete '${STAGING_DIR}/' /opt/traccar/web/ | tail -20"
```

Revisar el dry run de `rsync`. Si el staging contiene `index.html` y el listado esperado, hacer el swap y reiniciar:

```bash
ssh vigilateh-oracle "test -f '${STAGING_DIR}/index.html' && sudo rsync -a --delete '${STAGING_DIR}/' /opt/traccar/web/ && sudo systemctl restart traccar"
```

## FASE E — Smoke test post deploy

1. Abrir `https://vigilateh.duckdns.org/`: carga el mapa y aparece CRM en el sidebar para ADMIN/MANAGER.
2. Abrir `https://vigilateh.duckdns.org/crm`: tras login, carga la lista de clientes. En DevTools, `GET /api/crm/clients` debe devolver 200 con sesión.
3. Verificar pipeline, tickets, recordatorios, facturas y vínculo de usuario. Envío WhatsApp real solo si Miguel decide probarlo.
4. Revisar logs y endpoint público sin sesión:

```bash
ssh vigilateh-oracle 'cd /opt/vigilateh-whatsapp && docker compose logs --tail 50 crm-api'
curl -s -o /dev/null -w 'crm público:%{http_code}\n' https://vigilateh.duckdns.org/api/crm/clients
```

Esperado para el curl sin cookie: 401. Un 404 indica regla de proxy ausente; 502 indica sidecar inaccesible. No continuar si el mapa o la sesión Traccar fallan.

## ROLLBACK

Usar `BACKUP_DIR` de la fase D (o pegar la ruta exacta anotada si se cerró Git Bash). La ruta debe ser un backup de `/opt/traccar/web` creado en esta ejecución:

```bash
test -n "$BACKUP_DIR"
ssh vigilateh-oracle "test -f '${BACKUP_DIR}/index.html' && sudo rsync -a --delete '${BACKUP_DIR}/' /opt/traccar/web/ && sudo systemctl restart traccar"
```

Si también se retira el sidecar, detener solo ese servicio; `docker compose down crm-api` no es un comando válido. Quitar la regla Nginx añadida en fase C y validar/reload de Nginx. No borrar tablas CRM durante el rollback.

```bash
ssh vigilateh-oracle 'cd /opt/vigilateh-whatsapp && docker compose stop crm-api'
```
