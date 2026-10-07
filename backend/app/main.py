"""One process, three portals, one ledger."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

import jwt

from fastapi import Depends, FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.v1.admin_routes import router as admin_router
from app.api.v1.casino_routes import router as casino_router
from app.api.v1.agent_routes import router as agent_router
from app.api.v1.emit import emit
from app.api.v1.player_routes import router as player_router
from app.api.v1.schemas import LoginIn, RegisterIn
from app.core.models import User
from app.core.payments import integration_flags
from app.core.realtime import hub, redis_status
from app.core.security import JWT_SECRET, login_portal
from app.core import services
from app.db.session import SessionLocal, engine, get_db, init_db

ROOT = Path(__file__).resolve().parents[2]
APPS = ROOT / "apps"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    hub.loop = asyncio.get_running_loop()
    yield
    hub.loop = None


app = FastAPI(title="Superwin Shared Backend", lifespan=lifespan)
app.include_router(player_router)
app.include_router(agent_router)
app.include_router(admin_router)
app.include_router(casino_router)

HOST_HOME = {
    "superwin.bet": "/player",
    "www.superwin.bet": "/player",
    "superwinagentsystem.admindigi.com": "/agent",
    "superwinadmin.admindigi.com": "/admin",
}


@app.get("/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {
        "status": "ONLINE",
        "database": "CONNECTED",
        "dialect": engine.dialect.name,
        "redis": redis_status(),
        **integration_flags(),
    }


@app.post("/api/auth/login")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    return login_portal(db, payload.username, payload.password, payload.portal)


@app.post("/api/auth/register")
async def register(payload: RegisterIn):
    return await emit(services.create_account(None, payload.username, payload.email, payload.password, "player", None, None))


@app.websocket("/ws/{portal}")
async def socket(websocket: WebSocket, portal: str, token: str):
    if portal not in {"player", "agent", "admin"}:
        await websocket.close(code=4400)
        return
    db = SessionLocal()
    try:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user = db.get(User, int(payload.get("sub", "0")))
        except (jwt.PyJWTError, ValueError, TypeError):
            user = None
        if user is None or user.role != portal:
            await websocket.close(code=4401)
            return
        user_id = user.id
    finally:
        db.close()
    await hub.connect(portal, user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        hub.disconnect(portal, user_id, websocket)


def _spa(portal: str, rest: str = ""):
    dist = APPS / portal / "dist"
    source = APPS / portal
    base = dist if (dist / "index.html").exists() else source
    if rest:
        candidate = (base / rest).resolve()
        if candidate.is_file() and str(candidate).startswith(str(base.resolve())):
            return FileResponse(candidate)
    return FileResponse(base / "index.html")


@app.get("/")
def gate(request: Request):
    host = request.headers.get("host", "").split(":")[0].lower()
    destination = HOST_HOME.get(host)
    if destination:
        return RedirectResponse(destination, status_code=307)
    return FileResponse(Path(__file__).with_name("gate.html"))


@app.get("/player")
@app.get("/player/{rest:path}")
def player_pages(rest: str = ""):
    return _spa("player", rest)


@app.get("/agent")
@app.get("/agent/{rest:path}")
def agent_pages(rest: str = ""):
    return _spa("agent", rest)


@app.get("/admin")
@app.get("/admin/{rest:path}")
def admin_pages(rest: str = ""):
    return _spa("admin", rest)


init_db()
