#!/bin/bash
set -e
echo "=== VigilaTeh deploy ==="
tar -czf vigilateh-build.tar.gz -C build .
ls -lh vigilateh-build.tar.gz
echo ""
echo "=== Subiendo a Oracle (scp) ==="
scp -i "$USERPROFILE/Downloads/ssh-key-2026-09-01.key" \
    vigilateh-build.tar.gz \
    opc@163.192.155.192:/tmp/
echo ""
echo "=== SIGUIENTE PASO MANUAL (en Ventana A/Oracle) ==="
echo "sudo cp -r /opt/traccar/web /opt/traccar/web.bak.\$(date +%s)"
echo "sudo rm -rf /opt/traccar/web/*"
echo "sudo tar -xzf /tmp/vigilateh-build.tar.gz -C /opt/traccar/web/"
echo "sudo chown -R traccar:traccar /opt/traccar/web"
echo "sudo systemctl restart traccar"
