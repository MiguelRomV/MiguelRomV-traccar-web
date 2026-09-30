#!/usr/bin/env bash
set -euo pipefail
conf=/etc/nginx/conf.d/vigilateh-gps.conf
backup="$(find /etc/nginx/conf.d -maxdepth 1 -type f \
  -name 'vigilateh-gps.conf.bak-????????-??????' -printf '%f\n' | sort | tail -1)"
if [[ -z "$backup" ]]; then
  printf 'ROLLBACK FAIL: no hay backup de vigilateh-gps.conf.\n' >&2
  exit 1
fi
cp -a -- "/etc/nginx/conf.d/$backup" "$conf"
nginx -t && systemctl reload nginx
printf 'ROLLBACK OK: restaurado %s\n' "$backup"
