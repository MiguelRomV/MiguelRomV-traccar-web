# Fases C/D/E — VigilaTeh

Revisar antes de correr. Server: `/etc/nginx/conf.d/vigilateh-gps.conf`; CRM interno: `127.0.0.1:8090`. Detenerse ante cualquier error. Las ventanas indicadas son de Git Bash; los comandos `scp` se ejecutan LOCALMENTE, antes de entrar a SSH.

## Ventana 4 → comandos exactos (FASE C)

Git Bash LOCAL; directorio `C:\Users\Miguel\vigilateh-web\traccar-web`:

```bash
cd /c/Users/Miguel/vigilateh-web/traccar-web
scp docs/server/add-crm-proxy.py vigilateh-oracle:/tmp/
scp docs/server/deploy-fase-c.sh vigilateh-oracle:/tmp/
ssh -t vigilateh-oracle 'sudo bash /tmp/deploy-fase-c.sh'
```

El parche busca un único bloque `server` con `server_name vigilateh.duckdns.org` y `ssl_certificate`, crea un backup con timestamp e inserta el proxy. Si `/api/crm/` ya aparece en cualquier parte del archivo, sale sin editar: comprobar que la regla existente funciona. Conserva la ruta `BACKUP=` impresa. Si `nginx -t` falla, no se recarga; el archivo editado permanece para inspección/rollback.

## Ventana 1 — smoke público (FASE E del proxy)

Git Bash LOCAL; directorio `/c/Users/Miguel/vigilateh-web/traccar-web`:

```bash
curl -i https://vigilateh.duckdns.org/api/crm/clients
```

Esperado: **401** sin cookie. Un 404 requiere revisar la regla; un 502 requiere revisar acceso a `127.0.0.1:8090`. Si compartes salida, enmascara cookies, tokens y claves.

## Ventana 4 — rollback Nginx

Git Bash LOCAL; directorio `/c/Users/Miguel/vigilateh-web/traccar-web`:

```bash
scp docs/server/rollback-nginx.sh vigilateh-oracle:/tmp/
ssh -t vigilateh-oracle 'sudo bash /tmp/rollback-nginx.sh'
```

Restaura el backup con timestamp más reciente, valida y recarga Nginx. No selecciona otros archivos de configuración.

## FASE D/E — preparación, revisar antes de correr

Ventana 2, Git Bash LOCAL; directorio `/c/Users/Miguel/vigilateh-web/traccar-web`. Este comando únicamente **imprime** el plan de build, copia, backup, dry-run, swap, permisos y smoke tests:

```bash
bash docs/server/build-frontend.sh
```

Referencia comentada; ejecutar cada paso únicamente tras revisar su salida:

```bash
# Ventana 2 LOCAL — /c/Users/Miguel/vigilateh-web/traccar-web
# npm ci && npm run build
# test -f build/index.html
# Ventana 4 LOCAL — mismo directorio
# ssh vigilateh-oracle 'mkdir -p /tmp/web-new && test -z "$(ls -A /tmp/web-new)"'
# scp -r build/* vigilateh-oracle:/tmp/web-new/
# ssh vigilateh-oracle
# Ventana 4 SSH — /opt/traccar
# cd /opt/traccar
# sudo test -f /tmp/web-new/index.html
# WEB_BACKUP="/opt/traccar/web.bak-$(date +%Y%m%d-%H%M%S)"
# sudo cp -a /opt/traccar/web "$WEB_BACKUP"
# printf 'WEB_BACKUP=%s\n' "$WEB_BACKUP"
# WEB_OWNER=$(stat -c '%u:%g' /opt/traccar/web)
# sudo rsync -an --delete --chown="$WEB_OWNER" /tmp/web-new/ /opt/traccar/web/
# sudo rsync -a --delete --chown="$WEB_OWNER" /tmp/web-new/ /opt/traccar/web/
# namei -l /opt/traccar/web/index.html
# stat -c '%a %U:%G %n' /opt/traccar/web /opt/traccar/web/index.html
# sudo systemctl restart traccar
# systemctl is-active traccar
# exit
# Ventana 1 LOCAL — /c/Users/Miguel/vigilateh-web/traccar-web
# curl -sS -o /dev/null -w 'web:%{http_code}\n' https://vigilateh.duckdns.org/
# curl -sS -o /dev/null -w 'crm:%{http_code}\n' https://vigilateh.duckdns.org/api/crm/clients
```

Esperado: web **200**, CRM **401** sin sesión; con login, mapa y lista CRM cargan y el endpoint CRM devuelve **200**. Verificar en navegador los módulos existentes y WhatsApp. El seguimiento WhatsApp se diagnostica por separado.
