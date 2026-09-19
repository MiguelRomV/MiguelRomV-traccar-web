# Workflow de n8n para notificaciones WhatsApp

## Importar

1. Abrir n8n en `http://localhost:5678`
2. Ir a **Workflows → Import from File**
3. Seleccionar `whatsapp-workflow.json`
4. Seleccionar la credencial **Traccar Postgres** en el nodo **Get Recipients**
5. Publicar el workflow (botón "Publish")
6. Verificar que el webhook quede en `http://127.0.0.1:5678/webhook/traccar`

## Configuración

- **Evolution API URL:** `http://evolution-api:8080`
- **API key de Evolution:** variable `EVOLUTION_API_KEY` del entorno de n8n
- **Número destino:** columna `tc_users.phone`; no existe número fallback

### Acceso al PostgreSQL de Traccar

El servicio `n8n` necesita resolver el host del servidor desde Docker:

```yaml
services:
  n8n:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Crear en n8n una credencial Postgres llamada **Traccar Postgres**:

- Host: `host.docker.internal`
- Port: `5432`
- Database: `traccar`
- User: `traccar`
- Password: usar el secreto configurado en el servidor; no versionarlo
- SSL: deshabilitado

## Flujo

```text
Webhook
  → Parse Event + normalizeEventType
  → Supported Event?
  → Get Recipients (Postgres)
  → Filter + Build Messages
  → Has Recipients?
  → Loop Over Recipients (batch 1)
  → Evolution API
```

La consulta selecciona únicamente usuarios con seguimiento habilitado y vigente, teléfono registrado y el dispositivo recibido dentro de `attributes.whatsappDevices`. Después, el nodo de filtrado exige que el evento normalizado exista en `attributes.whatsappEvents`.

### Normalización de eventos

- `ignitionOn` → `ignitionOn`
- `ignitionOff` → `ignitionOff`
- `commandResult` con `cut off` → `engineCutSent`
- `commandResult` con `restore` → `engineCutRestored`
- Cualquier otro evento se descarta

## Verificación de conectividad

Desde el host:

```bash
docker exec n8n node -e "require('net').connect(5432,'host.docker.internal').on('connect',()=>{console.log('OK');process.exit(0)}).on('error',(e)=>{console.log('FAIL',e.message);process.exit(1)})"
```

## Si cambia la API key de Evolution

Actualizar `EVOLUTION_API_KEY` en el entorno de n8n y recrear el contenedor.

## Si se cae n8n

Los datos se guardan en `/opt/vigilateh-whatsapp/n8n-data` (volumen Docker). Recrear contenedor:

```bash
cd /opt/vigilateh-whatsapp
docker compose up -d
```
