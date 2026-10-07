#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "[1/6] Installing dependencies..."
if ! python3 -c "import ensurepip" >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y python3-venv
fi
if [[ ! -x .venv/bin/python ]]; then
  python3 -m venv .venv
fi
.venv/bin/pip install -r requirements.txt
if [[ ! -d node_modules ]]; then
  npm install
fi

echo "[2/6] Building the three frontends..."
npm run build

echo "[3/6] Running unit tests on SQLite..."
PYTHONPATH="$PWD/backend" .venv/bin/python -m pytest tests/test_platform.py -q

echo "[4/6] Preparing PostgreSQL..."
if ! command -v pg_isready >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y postgresql postgresql-contrib
fi
sudo service postgresql start
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then
    break
  fi
  sleep 1
done
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = 'igaming'" | grep -q 1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE igaming LOGIN PASSWORD 'igaming' SUPERUSER"
fi
if [[ -f /tmp/igaming-api.pid ]]; then
  old_pid="$(cat /tmp/igaming-api.pid || true)"
  if [[ -n "${old_pid}" ]] && kill -0 "${old_pid}" 2>/dev/null; then
    kill "${old_pid}" || true
    sleep 1
  fi
fi
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'igaming' AND pid <> pg_backend_pid();" || true
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS igaming;"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE igaming OWNER igaming;"

export DATABASE_URL="postgresql+psycopg2://igaming:igaming@127.0.0.1:5432/igaming"
if command -v redis-server >/dev/null 2>&1; then
  if ! redis-cli ping >/dev/null 2>&1; then
    redis-server --daemonize yes --bind 127.0.0.1 --port 6379
  fi
  export REDIS_URL="redis://127.0.0.1:6379/0"
fi

echo "[5/6] Starting the shared API..."
nohup env PYTHONPATH="$PWD/backend" \
  .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 > /tmp/igaming-api.log 2>&1 &
echo $! > /tmp/igaming-api.pid

ready=0
for _ in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8000/health >/dev/null; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "${ready}" -ne 1 ]]; then
  echo "Server did not become ready. Log:"
  cat /tmp/igaming-api.log
  exit 1
fi

echo "[6/6] Checking player, agent, and admin against PostgreSQL..."
.venv/bin/python tests/e2e_live.py

echo "---------------------------------------------------"
echo "WAA DIYAAR! MASHROUCA WAA SHUQULGELAY."
echo "---------------------------------------------------"
