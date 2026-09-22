# VigilaTeh CRM API

Sidecar Express para `/api/crm`; comparte PostgreSQL con Traccar y valida la
sesión reenviando la cookie `JSESSIONID` a la API de Traccar.

## Configuración local

1. Copia `.env.example` a `.env` y configura `DATABASE_URL` y `TRACCAR_URL`.
2. Instala dependencias dentro de este directorio con `npm install`.
3. Ejecuta `npm start`; la API escucha en el puerto 8090 y aplica la migración
   idempotente al iniciar.
4. El frontend usa `/api/crm`. Configura el proxy local/reverse proxy para
   dirigir esa ruta al sidecar.

## Fase 1

Implementa clientes CRUD y vínculo de dispositivos. Cada consulta de clientes
se limita al usuario de la sesión Traccar. El vínculo verifica acceso al
dispositivo con la misma sesión antes de guardar.

## Variables

- `PORT`: puerto HTTP (8090 por defecto).
- `DATABASE_URL`: conexión PostgreSQL de Traccar.
- `TRACCAR_URL`: URL base de la API de Traccar.
- `CORS_ORIGIN`: orígenes opcionales separados por comas; vacío desactiva CORS.

No guardes secretos en Git. En despliegues, Miguel configura las variables y
el proxy manualmente; esta fase no cambia servicios del servidor.
