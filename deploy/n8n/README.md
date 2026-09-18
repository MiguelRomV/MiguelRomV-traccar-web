# Workflow de n8n para notificaciones WhatsApp

## Importar

1. Abrir n8n en `http://localhost:5678`
2. Ir a **Workflows → Import from File**
3. Seleccionar `whatsapp-workflow.json`
4. Publicar el workflow (botón "Publish")
5. Verificar que el webhook quede en `http://127.0.0.1:5678/webhook/traccar`

## Configuración

- **Evolution API URL:** `http://evolution-api:8080`
- **API key de Evolution:** variable `EVOLUTION_API_KEY` del entorno de n8n.
- **Número destino:** variable `WHATSAPP_DEFAULT_NUMBER` del entorno de n8n.

## Si cambia la API key de Evolution

Actualizar `EVOLUTION_API_KEY` en el entorno de n8n y recrear el contenedor.

## Si se cae n8n

Los datos se guardan en `/opt/vigilateh-whatsapp/n8n-data` (volumen Docker). Recrear contenedor:

```bash
cd /opt/vigilateh-whatsapp
docker compose up -d
```
