# Superwin Platform — Base44 Dev Environment

## Architecture
- **Backend**: FastAPI (`backend/app/main.py`), entry point is `main:app` at repo root (a shim that inserts `backend/` on `sys.path`).
- **Frontend**: Three Vite workspaces (`apps/player`, `apps/agent`, `apps/admin`), each builds to `dist/` and is served as static SPA files by the backend.
- **Database**: PostgreSQL (compose service `postgres`). Schema is auto-created on startup via `init_db()` → `Base.metadata.create_all` + `seed()`.
- **Cache**: Redis (compose service `redis`), optional — used for pub/sub and health status only.

## Dev Environment
- `docker-compose.base44.yml` runs PostgreSQL, Redis, and the app service.
- The app service uses `Dockerfile.base44` (python:3.12-slim + Node.js 20).
- Startup flow: `npm install` → `npm run build` (builds all three frontends to `dist/`) → `uvicorn main:app --reload` on port 3000.
- Backend changes hot-reload via uvicorn `--reload --reload-dir backend`.
- Frontend changes require a rebuild (run `docker compose -f docker-compose.base44.yml exec app npm run build` or restart the service).
- No external secrets required at boot. `CHECK_ET_API_KEY`, `TELEGRAM_BOT_TOKEN`, etc. are optional and default to unset.

## Verifying
- Health: `curl http://localhost:3000/health` → `{"status":"ONLINE",...}`
- Tests: `docker compose -f docker-compose.base44.yml exec app sh -c "PYTHONPATH=/app/backend python -m pytest tests/test_platform.py -q"`
- Demo accounts: `player`/`play123`, `agent`/`agent123`, `admin`/`admin123`.

## Notes
- The original `setup_and_run.sh` uses PM2, Nginx, and host PostgreSQL — it does not work in the sandbox. Use the compose file instead.
- `db/session.py` loads `.env` from the repo root if present, but compose `environment:` takes precedence for `DATABASE_URL`, `JWT_SECRET`, etc.
