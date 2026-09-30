import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DATA_ROOT = Path(os.getenv("DATA_ROOT", "/srv/samba"))
STATE_FILE = Path(os.getenv("STATE_FILE", "/state/state.json"))
SMB_CONF = Path("/etc/samba/smb.conf")
SHARES_CONF = Path("/etc/samba/shares.conf")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "change-me-now")
SERVER_NAME = os.getenv("SMB_SERVER_NAME", "SMB-SERVER")

USER_RE = re.compile(r"^[a-zA-Z0-9._-]{1,32}$")
SHARE_RE = re.compile(r"^[a-zA-Z0-9._-]{1,64}$")


class UserCreate(BaseModel):
    username: str
    password: str = Field(min_length=4, max_length=128)


class PasswordChange(BaseModel):
    password: str = Field(min_length=4, max_length=128)


class ShareCreate(BaseModel):
    name: str
    path: str = ""
    comment: str = ""
    guest: bool = False
    guest_access: Literal["RO", "RW"] = "RO"


class AccessChange(BaseModel):
    username: str
    access: Literal["RO", "RW"]


app = FastAPI(title="SMB Manager", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def auth(x_admin_token: str | None = Header(default=None)):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")


def load_state():
    if not STATE_FILE.exists():
        return {"users": [], "shares": {}}
    try:
        return json.loads(STATE_FILE.read_text())
    except Exception:
        return {"users": [], "shares": {}}


def save_state(state):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = STATE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2))
    tmp.replace(STATE_FILE)


def validate_user(username):
    if not USER_RE.fullmatch(username):
        raise HTTPException(400, "Invalid username")


def validate_share(name):
    if not SHARE_RE.fullmatch(name):
        raise HTTPException(400, "Invalid share name")


def safe_path(relative_or_empty: str, fallback_name: str) -> Path:
    raw = relative_or_empty.strip() or fallback_name
    p = Path(raw)
    if p.is_absolute():
        # Only allow paths inside DATA_ROOT.
        target = p.resolve()
    else:
        target = (DATA_ROOT / p).resolve()
    root = DATA_ROOT.resolve()
    if target != root and root not in target.parents:
        raise HTTPException(400, "Path must be inside DATA_ROOT")
    return target


def run(cmd, input_text=None, check=True):
    return subprocess.run(
        cmd, input=input_text, text=True, capture_output=True, check=check
    )


def user_exists(username):
    return subprocess.run(
        ["id", "-u", username], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    ).returncode == 0


def ensure_samba_user(username, password):
    if not user_exists(username):
        run(["useradd", "-M", "-s", "/usr/sbin/nologin", username])
    # smbpasswd -a creates/updates the Samba password database.
    p = subprocess.run(
        ["smbpasswd", "-a", "-s", username],
        input=f"{password}\n{password}\n",
        text=True,
        capture_output=True,
    )
    if p.returncode != 0:
        raise HTTPException(500, p.stderr.strip() or "smbpasswd failed")


def remove_samba_user(username):
    subprocess.run(["smbpasswd", "-x", username], capture_output=True, text=True)
    subprocess.run(["userdel", username], capture_output=True, text=True)


def apply_acl(path: Path, username: str, access: str):
    mode = "rwx" if access == "RW" else "r-x"
    run(["setfacl", "-m", f"u:{username}:{mode}", str(path)])
    # New files/directories inherit the selected access.
    run(["setfacl", "-d", "-m", f"u:{username}:{mode}", str(path)], check=False)


def remove_acl(path: Path, username: str):
    run(["setfacl", "-x", f"u:{username}", str(path)], check=False)
    run(["setfacl", "-d", "-x", f"u:{username}", str(path)], check=False)


def render_shares(state):
    lines = []

    for name, share in state["shares"].items():
        path = share["path"]
        comment = share.get("comment", "")

        # Гостевая папка без логина и пароля
        if share.get("guest", False):
            guest_access = share.get("guest_access", "RO")

            lines += [
                f"[{name}]",
                f"    path = {path}",
                f"    comment = {comment}",
                "    browseable = yes",
                "    guest ok = yes",
                "    guest only = yes",
                "    inherit acls = yes",
                "    nt acl support = yes",
            ]

            if guest_access == "RW":
                lines += [
                    "    read only = no",
                    "    force user = nobody",
                    "    force group = nogroup",
                    "    create mask = 0666",
                    "    force create mode = 0660",
                    "    directory mask = 0777",
                    "    force directory mode = 0770",
                ]
            else:
                lines += [
                    "    read only = yes",
                ]

            lines.append("")
            continue

        # Обычная папка с авторизацией пользователей
        access = share.get("access", {})
        rw = [u for u, a in access.items() if a == "RW"]
        ro = [u for u, a in access.items() if a == "RO"]
        valid = rw + ro

        lines += [
            f"[{name}]",
            f"    path = {path}",
            f"    comment = {comment}",
            "    browseable = yes",
            "    read only = yes",
            "    inherit acls = yes",
            "    nt acl support = yes",
            "    create mask = 0660",
            "    directory mask = 0770",
            f"    valid users = {' '.join(valid)}"
            if valid
            else "    valid users = nobody",
            f"    write list = {' '.join(rw)}" if rw else "    write list =",
            "",
        ]

    SHARES_CONF.write_text("\n".join(lines))

    test = subprocess.run(
        ["testparm", "-s"],
        capture_output=True,
        text=True,
    )

    if test.returncode != 0:
        raise HTTPException(
            500,
            test.stderr[-2000:] or "Invalid Samba configuration",
        )

    subprocess.run(
        ["pkill", "-HUP", "smbd"],
        capture_output=True,
    )

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/info")
def info(_: None = Depends(auth)):
    return {"server_name": SERVER_NAME, "data_root": str(DATA_ROOT)}


@app.get("/api/users")
def list_users(_: None = Depends(auth)):
    return load_state()["users"]


@app.post("/api/users")
def create_user(data: UserCreate, _: None = Depends(auth)):
    validate_user(data.username)
    state = load_state()
    if data.username in state["users"]:
        raise HTTPException(409, "User already exists")
    ensure_samba_user(data.username, data.password)
    state["users"].append(data.username)
    save_state(state)
    return {"username": data.username}


@app.put("/api/users/{username}/password")
def change_password(username: str, data: PasswordChange, _: None = Depends(auth)):
    validate_user(username)
    state = load_state()
    if username not in state["users"]:
        raise HTTPException(404, "User not found")
    ensure_samba_user(username, data.password)
    return {"ok": True}


@app.delete("/api/users/{username}")
def delete_user(username: str, _: None = Depends(auth)):
    validate_user(username)
    state = load_state()
    if username not in state["users"]:
        raise HTTPException(404, "User not found")
    for share in state["shares"].values():
        share.get("access", {}).pop(username, None)
        remove_acl(Path(share["path"]), username)
    remove_samba_user(username)
    state["users"].remove(username)
    save_state(state)
    render_shares(state)
    return {"ok": True}


@app.get("/api/shares")
def list_shares(_: None = Depends(auth)):
    return load_state()["shares"]


@app.post("/api/shares")
def create_share(data: ShareCreate, _: None = Depends(auth)):
    validate_share(data.name)
    state = load_state()
    if data.name in state["shares"]:
        raise HTTPException(409, "Share already exists")
    path = safe_path(data.path, data.name)
    path.mkdir(parents=True, exist_ok=True)

    if data.guest:
        if data.guest_access == "RW":
            path.chmod(0o777)

            nobody_uid = subprocess.run(
                ["id", "-u", "nobody"],
                capture_output=True,
                text=True,
                check=True,
            ).stdout.strip()

            nobody_gid = subprocess.run(
                ["id", "-g", "nobody"],
                capture_output=True,
                text=True,
                check=True,
            ).stdout.strip()

            os.chown(path, int(nobody_uid), int(nobody_gid))
        else:
            path.chmod(0o755)
    else:
        path.chmod(0o770)

    state["shares"][data.name] = {
        "path": str(path),
        "comment": data.comment,
        "guest": data.guest,
        "guest_access": data.guest_access if data.guest else "RO",
        "access": {},
    }
    save_state(state)
    render_shares(state)
    return state["shares"][data.name] | {"name": data.name}


@app.delete("/api/shares/{name}")
def delete_share(name: str, _: None = Depends(auth)):
    validate_share(name)
    state = load_state()
    share = state["shares"].get(name)
    if not share:
        raise HTTPException(404, "Share not found")
    path = Path(share["path"])
    if path.exists():
        shutil.rmtree(path)
    del state["shares"][name]
    save_state(state)
    render_shares(state)
    return {"ok": True}


@app.put("/api/shares/{name}/access")
def set_access(name: str, data: AccessChange, _: None = Depends(auth)):
    validate_share(name)
    validate_user(data.username)
    state = load_state()
    share = state["shares"].get(name)
    if not share:
        raise HTTPException(404, "Share not found")
    if data.username not in state["users"]:
        raise HTTPException(404, "User not found")
    share.setdefault("access", {})[data.username] = data.access
    apply_acl(Path(share["path"]), data.username, data.access)
    save_state(state)
    render_shares(state)
    return share


@app.delete("/api/shares/{name}/access/{username}")
def remove_access(name: str, username: str, _: None = Depends(auth)):
    validate_share(name)
    validate_user(username)
    state = load_state()
    share = state["shares"].get(name)
    if not share:
        raise HTTPException(404, "Share not found")
    share.setdefault("access", {}).pop(username, None)
    remove_acl(Path(share["path"]), username)
    save_state(state)
    render_shares(state)
    return share


@app.post("/api/reload")
def reload_config(_: None = Depends(auth)):
    render_shares(load_state())
    return {"ok": True}
