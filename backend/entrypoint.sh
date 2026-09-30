#!/bin/bash
set -e

mkdir -p /srv/samba /etc/samba /state
chmod 755 /srv/samba

if [ ! -f /etc/samba/smb.conf ]; then
  cat > /etc/samba/smb.conf <<'EOF'
[global]
    workgroup = WORKGROUP
    server string = SMB Manager
    security = user
    map to guest = never
    server min protocol = SMB2
    smb ports = 445
    load printers = no
    disable spoolss = yes
    log level = 1
EOF
fi

# Always include application-managed shares.
grep -qxF 'include = /etc/samba/shares.conf' /etc/samba/smb.conf || \
  printf '\ninclude = /etc/samba/shares.conf\n' >> /etc/samba/smb.conf

touch /etc/samba/shares.conf

# Recreate Linux accounts from persistent application state after container recreation.
if [ -f /state/state.json ]; then
  python - <<'PY2'
import json, subprocess
from pathlib import Path
p=Path("/state/state.json")
try:
    state=json.loads(p.read_text())
except Exception:
    state={"users": []}
for u in state.get("users", []):
    if subprocess.run(["id", "-u", u], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode != 0:
        subprocess.run(["useradd", "-M", "-s", "/usr/sbin/nologin", u], check=False)
PY2
fi

# Samba needs the private directory for its passdb.
mkdir -p /etc/samba/private
chmod 700 /etc/samba/private

# Start Samba in foreground mode in the background of this container.
smbd -F --no-process-group -s /etc/samba/smb.conf &
SMBD_PID=$!

term() {
  kill "$SMBD_PID" 2>/dev/null || true
  exit 0
}
trap term SIGTERM SIGINT

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
API_PID=$!

wait -n "$SMBD_PID" "$API_PID"
exit 1
