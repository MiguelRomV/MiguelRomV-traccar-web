#!/usr/bin/env bash
# Diagnóstico de solo lectura para /opt/vigilateh-whatsapp (ejecutar en el servidor).
# Requiere acceso al grupo docker. No envía mensajes ni cambia servicios/DB.
set -u
set -o pipefail
umask 077

cd /opt/vigilateh-whatsapp || exit 1

section() { printf '\n=== %s ===\n' "$1"; }
redact() {
  sed -E \
    -e 's/(apikey|authorization|password|token)[=: ]+[^ ,;]+/\1=[REDACTED]/Ig' \
    -e 's/[0-9]{8,15}/[REDACTED_NUMBER]/g'
}

section 'Procesos y servicios (solo lectura)'
ps -eo pid,comm | grep -Ei '(^ *PID|node|cron|docker|traccar)' | head -60 || true
systemctl list-units --type=service --all --no-pager --plain 2>/dev/null |
  grep -Ei 'traccar|n8n|evolution|whatsapp|cron' || true
systemctl list-timers --all --no-pager --plain 2>/dev/null |
  grep -Ei 'traccar|n8n|evolution|whatsapp|cron' || true
docker compose ps 2>&1 || true

section 'Estado de Evolution (instancia vigilateh)'
evo_key="$(docker inspect evolution-api --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null |
  sed -n 's/^AUTHENTICATION_API_KEY=//p' | head -1)"
if [[ -z "$evo_key" ]]; then
  echo 'No se obtuvo AUTHENTICATION_API_KEY del contenedor; no se imprime ninguna clave.'
else
  state_response="$(curl -sS --max-time 15 -H "apikey: $evo_key" \
    -w '\n%{http_code}' http://127.0.0.1:8080/instance/connectionState/vigilateh 2>&1)"
  state_http="${state_response##*$'\n'}"
  printf 'HTTP: %s\n' "$state_http"
  if [[ "$state_http" == 200 ]] && command -v python3 >/dev/null 2>&1; then
    printf '%s' "${state_response%$'\n'*}" | python3 -c \
      'import json,sys; d=json.load(sys.stdin); i=d.get("instance") or {}; print("state:", i.get("state") or d.get("state") or "unknown")' \
      || echo 'No se pudo interpretar la respuesta de Evolution.'
  fi
  unset state_response state_http
fi

section 'Logs de las últimas 24 h (revisar antes de compartir)'
for container in n8n evolution-api; do
  printf '\n-- %s --\n' "$container"
  docker logs --since 24h --tail 5000 "$container" 2>&1 |
    grep -Ei 'whatsapp|evolution|notif|webhook|error|disconnect|connection' |
    tail -80 | redact || true
done
printf '\n-- traccar / systemd --\n'
journalctl -u traccar --since '24 hours ago' --no-pager -o short-iso 2>&1 |
  grep -Ei 'whatsapp|evolution|notif|webhook|error' | tail -80 | redact || true

section 'Ventana del último mensaje conocido (25/09/2026 12:15-13:30 CDMX)'
for container in n8n evolution-api; do
  printf '\n-- %s --\n' "$container"
  docker logs --since '2026-09-25T12:15:00-06:00' \
    --until '2026-09-25T13:30:00-06:00' "$container" 2>&1 |
    grep -Ei 'whatsapp|evolution|notif|webhook|error|disconnect|connection' |
    tail -80 | redact || true
done

section 'Último mensaje saliente VigilaTeh en Evolution (consulta opcional)'
echo 'Solo consulta la primera página de historial; no prueba entrega en el teléfono.'
if [[ -n "$evo_key" ]] && command -v python3 >/dev/null 2>&1; then
  read -r -s -p 'Número destinatario, solo dígitos (Enter para omitir): ' diag_phone
  printf '\n'
  if [[ "$diag_phone" =~ ^[0-9]{8,15}$ ]]; then
    msg_response="$(printf '{"where":{"key":{"remoteJid":"%s@s.whatsapp.net"}}}' "$diag_phone" |
      curl -sS --max-time 20 -X POST -H "apikey: $evo_key" \
        -H 'Content-Type: application/json' --data-binary @- \
        -w '\n%{http_code}' http://127.0.0.1:8080/chat/findMessages/vigilateh 2>&1)"
    msg_http="${msg_response##*$'\n'}"
    printf 'HTTP: %s\n' "$msg_http"
    if [[ "$msg_http" == 200 ]]; then
      printf '%s' "${msg_response%$'\n'*}" | python3 -c '
import datetime,json,sys
d=json.load(sys.stdin)
m=d.get("messages") or {}
records=m.get("records",[]) if isinstance(m,dict) else []
if not records and isinstance(d,dict): records=d.get("records",[])
matches=[]
for r in records:
    if not (r.get("key") or {}).get("fromMe"): continue
    body=r.get("message") or {}
    txt=body.get("conversation") or (body.get("extendedTextMessage") or {}).get("text") or ""
    if "VigilaTeh" not in txt: continue
    try: ts=float(r.get("messageTimestamp") or r.get("timestamp") or 0)
    except (TypeError,ValueError): ts=0
    matches.append(ts)
if matches:
    print("Última notificación encontrada (UTC):", datetime.datetime.fromtimestamp(max(matches),datetime.timezone.utc).isoformat())
else:
    print("Sin notificación saliente VigilaTeh en la primera página consultada.")
' || echo 'No se pudo interpretar el historial de Evolution.'
    fi
    unset msg_response msg_http
  elif [[ -n "$diag_phone" ]]; then
    echo 'Número inválido; se omite la consulta.'
  else
    echo 'Consulta omitida.'
  fi
  unset diag_phone
else
  echo 'Consulta omitida: falta clave en contenedor o python3.'
fi
unset evo_key

section 'Estado de seguimiento en tc_users y últimos eventos'
if docker compose ps --services --status running 2>/dev/null | grep -qx 'crm-api'; then
  # Usa DATABASE_URL ya presente dentro del contenedor CRM; nunca la imprime.
  docker compose exec -T crm-api node - <<'NODE'
const { Client } = require('pg');
(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await db.connect();
    const users = await db.query(`
      SELECT id,
        COALESCE((attributes::jsonb->>'whatsappEnabled')::boolean, false) AS enabled,
        attributes::jsonb->>'whatsappExpiresAt' AS expires_at,
        CASE WHEN NULLIF(attributes::jsonb->>'whatsappExpiresAt','')::timestamptz > NOW()
          THEN 'future' ELSE 'past_or_missing' END AS expiry_state,
        COALESCE(jsonb_array_length(CASE
          WHEN jsonb_typeof(attributes::jsonb->'whatsappDevices') = 'array'
          THEN attributes::jsonb->'whatsappDevices' ELSE '[]'::jsonb END), 0) AS device_count,
        COALESCE(jsonb_array_length(CASE
          WHEN jsonb_typeof(attributes::jsonb->'whatsappEvents') = 'array'
          THEN attributes::jsonb->'whatsappEvents' ELSE '[]'::jsonb END), 0) AS event_count,
        (phone IS NOT NULL AND phone <> '') AS phone_present
      FROM tc_users
      WHERE attributes::jsonb ? 'whatsappEnabled'
      ORDER BY id LIMIT 50`);
    console.log('Usuarios con seguimiento configurado (máx. 50; sin teléfono/email):');
    console.table(users.rows);
    const events = await db.query(`
      SELECT deviceid, type, eventtime
      FROM tc_events
      WHERE type IN ('ignitionOn','ignitionOff','commandResult',
                     'deviceOnline','deviceOffline','deviceUnknown')
      ORDER BY eventtime DESC LIMIT 10`);
    console.log('Últimos eventos relevantes en Traccar (no equivalen a envíos):');
    console.table(events.rows);
  } catch (error) {
    console.error('Consulta DB falló:', error.message);
    process.exitCode = 1;
  } finally {
    await db.end().catch(() => {});
  }
})();
NODE
elif command -v psql >/dev/null 2>&1 && [[ -t 0 ]]; then
  echo 'crm-api no corre; se intentará psql local (pedirá contraseña sin mostrarla).'
  psql -X -h 127.0.0.1 -U traccar -d traccar -v ON_ERROR_STOP=1 \
    -c "SELECT id, attributes::jsonb->>'whatsappEnabled' AS enabled,
       attributes::jsonb->>'whatsappExpiresAt' AS expires_at,
       CASE WHEN NULLIF(attributes::jsonb->>'whatsappExpiresAt','')::timestamptz > NOW()
         THEN 'future' ELSE 'past_or_missing' END AS expiry_state
       FROM tc_users WHERE attributes::jsonb ? 'whatsappEnabled'
       ORDER BY id LIMIT 50" \
    -c "SELECT deviceid, type, eventtime FROM tc_events
        WHERE type IN ('ignitionOn','ignitionOff','commandResult',
                       'deviceOnline','deviceOffline','deviceUnknown')
        ORDER BY eventtime DESC LIMIT 10" || echo 'Consulta psql falló; no se modificó la DB.'
else
  echo 'Sin crm-api en marcha ni psql interactivo; no se pudo consultar Traccar DB.'
  echo 'Revisar tc_users.attributes.whatsappEnabled/whatsappExpiresAt y tc_events con acceso DB autorizado.'
fi

printf '\nDiagnóstico terminado. No se cambió ningún servicio, dato ni configuración.\n'
