# Superwin — Base44 Setup Notes

## Architecture

Monorepo with three Vite frontend apps (`apps/player`, `apps/agent`, `apps/admin`)
and one FastAPI backend (`backend/`). A single `main.py` at the repo root is an
ASGI shim that imports `backend.app.main:app`.

The backend serves the **built** SPA files from `apps/<portal>/dist/` at the
paths `/player`, `/agent`, `/admin`. API routes live under `/api/...` and a
WebSocket endpoint at `/ws/{portal}`. The root `/` shows a gate page with links
to the three portals.

## Running in the Base44 sandbox

`docker compose -f docker-compose.base44.yml up -d` starts four services:

| Service | Image | Role |
|---|---|---|
| `postgres` | `postgres:16` | Primary database (`igaming` db, `igaming` user) |
| `redis` | `redis:7` | Pub/sub for realtime fan-out |
| `frontend` | `node:22-slim` | `npm install` → initial build → `vite build --watch` for all three apps |
| `backend` | `python:3.12-slim` | `pip install` → `uvicorn main:app --reload` on port 3000 |

The backend waits for the frontend's initial build (healthcheck confirms
`dist/index.html` exists for all three apps) before starting.

## Key behaviours

- **Auto-seed**: `init_db()` runs on import — creates tables and seeds demo
  users, permissions, sport events, casino games, and providers. No manual
  migration step needed.
- **Demo accounts**: `player` / `play123`, `agent` / `agent123`, `admin` / `admin123`.
- **External integrations are optional**: Check.et (Telebirr deposit
  verification) and Telegram notifications return "UNSET"/no-op when their env
  vars are empty. The app boots and works without them.
- **JWT_SECRET / CASINO_HMAC_SECRET** have code-level defaults but are set to
  dev values in compose `environment:`.
- **`.env` loading**: `backend/app/db/session.py` reads a repo-root `.env`
  file, but only fills vars that are unset or placeholder. Compose
  `environment:` values always win.

## Live reload

- **Backend**: `uvicorn --reload --reload-dir backend` watches `backend/` for
  Python changes. `main.py` (root shim) changes require a manual restart.
- **Frontend**: `vite build --watch` rebuilds `apps/<portal>/dist/` on source
  changes. Refresh the preview page to see updates.

## Verification

```bash
curl -s http://localhost:3000/health   # → {"status":"ONLINE","database":"CONNECTED",...}
curl -s http://localhost:3000/         # → gate page HTML with portal links
```

Log in at `/player/login` with `player` / `play123` to exercise the player
portal.
