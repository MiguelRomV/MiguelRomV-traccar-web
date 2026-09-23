# Auditoría Sesión 15 — Reporte Codex
Fecha: 2026-09-23

## Resumen ejecutivo
- Commits nuevos: 6 — `19265c51` CRM fix: clientes 500 por GROUP BY en JOIN tc_users; `4fe1cff5` CRM fase 4: tickets + recordatorios + facturación (fix); `2a07f5e1` Replay filtro fechas extendido (fix); `7308147f` docs cleanup server + .gitignore .bak (fix); `6207cbbd` CRM fase 3: envío WhatsApp + pipeline deals (fix); `c186a051` CRM fase 4: tickets + recordatorios + facturación (fix).
- Fases con fixes: F3, F4, D, E.
- Fases OK sin cambios: F5.
- Fases bloqueadas: ninguna. El límite de F4 se verificó en una instancia temporal del código nuevo (puerto 8091); el sidecar habitual de Miguel en 8090 aún requiere reinicio para cargarlo.

## PASO 0 — Entorno
- Resultado de los 4 curls: `traccar:200`, `evo:200`, `crm:401`, `vite:200` (repetidos desde Codex después de la confirmación de Miguel).
- Cookie obtenida: sí; autenticación a `/api/crm/clients`: HTTP 200. No se guardó en archivos.

## TAREA 1 — Commit fix SQL
- Estado: OK.
- Commit: `19265c51` (dos expresiones `jsonb_agg` y `deploy/crm-api/package-lock.json`).
- Build: OK antes del commit.

## TAREA 2 — Auditoría F3
- Estado: ⚠️ Corregido.
- Bugs encontrados: `expected_close` vuelve de PostgreSQL como fecha ISO completa; el campo HTML `type=date` recibía un valor inválido al editar oportunidades.
- Fixes aplicados: `6207cbbd`, normalización a `YYYY-MM-DD` en `DealsTab`; conserva la fecha que el usuario editó.
- Smoke tests: deal POST 201 (`lead`); board GET 200 (aparece en `lead`); PUT 200 (`contactado`); board GET 200 (aparece en `contactado`); POST con stage inválido 400; DELETE 204. Deal con fecha: POST 201 devolvió ISO completo; DELETE 204. No quedaron datos de prueba.
- Auditoría de código: board usa `draggable`, `onDragStart`, `onDrop` nativos; stages validados y default `lead`; envío valida teléfono, convierte error no 2xx de Evolution en 502 e inserta mensaje `out` solo tras respuesta exitosa.
- No validado en navegador: enviar WhatsApp real y arrastrar tarjetas visualmente. No se ejecutó POST `/messages`.

## TAREA 3 — Auditoría F4
- Estado: ⚠️ Corregido.
- Bugs encontrados: edición global de tickets/facturas no precargaba el cliente; `/reminders/upcoming` carecía de límite superior; facturas devolvían fechas ISO completas que no cabían en `type=date`.
- Fixes aplicados: `4fe1cff5` precarga `clientId` y acota próximos a 120 días (el ejemplo de prueba del handoff, 2026-12-31, queda dentro); `c186a051` convierte fechas de facturas a `YYYY-MM-DD` en formulario/lista.
- Smoke tests: ticket POST 201 (`open`), GET 200, PUT 200 (`closed_at` presente), DELETE 204. Reminder POST 201, upcoming GET 200 (incluido), PUT 200 (`done=true`), upcoming GET 200 (excluido), DELETE 204. Invoice POST 201 (`MXN`, `pending`), GET 200, PUT 200 (`paid`, `paid_at`), DELETE 204. El proceso viejo en 8090 incluyó un reminder de 2027. Una instancia temporal con el código actualizado en 8091 recibió reminders de 2026-12-31 y 2027-12-31 (POST 201 ambos); upcoming GET 200 incluyó el cercano y excluyó el lejano; DELETE 204 ambos. Se apagó 8091. No quedaron datos de prueba.
- Auditoría de código: CRUD usa `owner_id` mediante JOIN con `tc_crm_clients`; ticket cierra con `closed_at`; fechas entran validadas y se guardan en columnas DATE/TIMESTAMPTZ.
- No validado en navegador: edición global, filtros de recordatorios y formularios de facturas.

## TAREA 4 — Auditoría F5
- Estado: ✅ OK.
- Bugs encontrados: ninguno adicional al fix SQL de Tarea 1.
- Fixes aplicados: ninguno en esta fase.
- Smoke tests: usuarios GET 200 (4); cliente GET 200 sin vínculo; PUT 200 vinculó usuario existente 10; GET 200 devolvió `traccarUser` con `id`, `name`, `email`; PUT 200 restauró vínculo original `null`; GET 200 confirmó restauración.
- Auditoría de código: migración 002 usa `IF NOT EXISTS` y FK `ON DELETE SET NULL`; listado/detalle agregan `traccarUser`; `OverviewTab` muestra Vincular/Desvincular según estado.
- No validado en navegador: dropdown y cambio visual al vincular/desvincular.

## TAREA 5 — Auditoría D
- Estado: ⚠️ Corregido.
- Bugs encontrados: elegir “Personalizado” no mostraba los dos campos si el botón extendido estaba cerrado; el recorte por días naturales podía exceder 120 × 24 horas al cruzar cambio horario.
- Fixes aplicados: `2a07f5e1` muestra siempre ambos campos al elegir personalizado, conecta el botón extendido a esa opción, muestra “Aplicar” y recorta por milisegundos exactos; traduce Hoy/Ayer.
- Smoke tests: `npm run build` OK; lint dirigido de Replay OK. `npm run lint` global falla en `src/main/DeviceList.jsx:85` por formato preexistente, sin warnings nuevos. Revisión de código: presets generan `from/to`, custom valida orden y máximo 120 días, URL se actualiza; sin params mantiene Hoy. Gráfico y lista de eventos no cambiaron.
- No validado en navegador: interacción visual de presets/custom, gráfico y eventos.

## TAREA 6 — Auditoría E
- Estado: ⚠️ Corregido.
- Bugs encontrados: el inventario y los comandos de `web.bak.*` filtraban solo archivos; los backups web pueden ser directorios.
- Fixes aplicados: `7308147f` incluye directorios al inventariar y retirar los dos backups web más antiguos tras revisión manual.
- Smoke tests: `git check-ignore HANDOFF-Sesion15-Codex.txt` devolvió el path; `.gitignore` contiene `*.bak-*` y `HANDOFF*.txt`; documento existente y build OK antes del commit.
- No validado en navegador: no aplica. La limpieza por SSH corresponde a Miguel.

## Pendientes para Miguel
- Reiniciar `npm start` del sidecar habitual en 8090 para cargar el fix ya probado en 8091.
- Validación visual F3 (enviar WhatsApp real desde UI), F4 (tickets/reminders/invoices UI), F5 (vincular/desvincular UI) y D (filtros de replay UI).
- Push a origin de los commits nuevos y deploy al server (scp + docker compose + nginx proxy), solo cuando valide.

## Riesgos / Notas
- El proceso habitual del sidecar en 8090 sigue devolviendo recordatorios posteriores a 120 días; el fix en disco ya pasó la prueba en 8091 y necesita reinicio de 8090 para surtir efecto en la UI.
- No se envió WhatsApp real ni se usó SSH desde Codex.
- `npm run lint` global tiene un único error previo de Prettier en `src/main/DeviceList.jsx:85`; los archivos modificados pasaron lint dirigido.
- El inventario completo de backups del servidor no estaba en el handoff. Miguel debe confirmar rutas y lista antes de ejecutar borrado.
- F4 requirió dos commits de fix: el problema de fechas apareció en el smoke test después del primer commit. El reporte queda sin commit porque el handoff no asignó mensaje de commit al artefacto de auditoría.
