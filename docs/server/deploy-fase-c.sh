#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if python3 "$script_dir/add-crm-proxy.py" && nginx -t; then
  systemctl reload nginx
  printf 'FASE C OK: Nginx validado y recargado. Verificar curl público: 401.\n'
else
  printf 'FASE C FAIL: Nginx no se recargó. Revisar error y backup; usar rollback.\n' >&2
  exit 1
fi
