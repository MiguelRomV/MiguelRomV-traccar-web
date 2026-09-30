#!/usr/bin/env python3
"""Insertar el proxy CRM en el único server HTTPS del dominio indicado."""
import datetime
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile

CONF = Path(sys.argv[1] if len(sys.argv) > 1 else '/etc/nginx/conf.d/vigilateh-gps.conf')
SNIPPET = '''    location ^~ /api/crm/ {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
'''


def main():
    raw = CONF.read_bytes()
    source = raw.decode('utf-8')
    if '/api/crm/' in source:
        print('SIN CAMBIOS: /api/crm/ ya aparece en la configuración; verificar curl público.')
        return
    # Ignorar comentarios y reconocer comillas: sus llaves no cierran bloques.
    pattern = r'''\#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[{};]|[^\s{};#"']+'''
    tokens = [(m.group(), m.start()) for m in re.finditer(pattern, source)
              if not m.group().startswith('#')]
    candidates = []
    for index, (value, _) in enumerate(tokens[:-1]):
        if value != 'server' or tokens[index + 1][0] != '{':
            continue
        depth, directive, names, has_ssl = 1, [], [], False
        for token, offset in tokens[index + 2:]:
            if token == '{':
                depth += 1
                directive = []
            elif token == '}':
                depth -= 1
                directive = []
                if depth == 0:
                    if 'vigilateh.duckdns.org' in names and has_ssl:
                        candidates.append(offset)
                    break
            elif depth == 1 and token == ';':
                if directive and directive[0] == 'server_name':
                    names.extend(item.strip('\"\'') for item in directive[1:])
                if directive and directive[0] == 'ssl_certificate' and len(directive) > 1:
                    has_ssl = True
                directive = []
            elif depth == 1:
                directive.append(token)
        else:
            raise ValueError('Bloque server sin cierre; no se modificó el archivo.')
    if len(candidates) != 1:
        raise ValueError(f'Se esperaba un server HTTPS del dominio; encontrados: {len(candidates)}.')
    closing = candidates[0]
    line_start = source.rfind('\n', 0, closing) + 1
    insertion = line_start if not source[line_start:closing].strip() else closing
    newline = '\r\n' if '\r\n' in source else '\n'
    snippet = SNIPPET.replace('\n', newline)
    if insertion and source[insertion - 1] != '\n':
        snippet = newline + snippet
    updated = (source[:insertion] + snippet + source[insertion:]).encode('utf-8')
    stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    backup = CONF.with_name(CONF.name + '.bak-' + stamp)
    with backup.open('xb') as handle:
        handle.write(raw)
    shutil.copystat(CONF, backup)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=CONF.parent, delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(updated)
        shutil.copystat(CONF, temporary)
        info = CONF.stat()
        os.chown(temporary, info.st_uid, info.st_gid)
        os.replace(temporary, CONF)
        temporary = None
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    print('Proxy CRM insertado.')
    print(f'BACKUP={backup}')


if __name__ == '__main__':
    try:
        main()
    except (OSError, UnicodeError, ValueError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        sys.exit(1)
