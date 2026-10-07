#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

DB_PASSWORD="superwin_master_pass_2026"
export JWT_SECRET="superwin_jwt_secret_key_prod_2026"
export CASINO_HMAC_SECRET="superwin_hmac_secret_key_2026"
export DATABASE_URL="postgresql+psycopg2://igaming:${DB_PASSWORD}@127.0.0.1:5432/igaming"
export PORT="8000"

echo "[1/7] Installing dependencies..."
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
if ! command -v pm2 >/dev/null 2>&1; then
  sudo env "PATH=$PATH" npm install -g pm2
fi
if ! command -v nginx >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y nginx
fi

if [[ ! -f .env ]]; then
  cat > .env << EOF
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
CASINO_HMAC_SECRET=${CASINO_HMAC_SECRET}
CHECK_ET_API_KEY=
CHECK_ET_BASE_URL=https://api.check.et
TELEBIRR_ACCOUNT=
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
PORT=${PORT}
EOF
fi

echo "[2/7] Building the three frontends..."
npm run build

echo "[3/7] Running unit tests on SQLite..."
PYTHONPATH="$PWD/backend" .venv/bin/python -m pytest tests/test_platform.py -q

echo "[4/7] Preparing PostgreSQL..."
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
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = 'igaming'" | grep -q 1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER ROLE igaming WITH LOGIN PASSWORD '${DB_PASSWORD}' SUPERUSER"
else
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE igaming LOGIN PASSWORD '${DB_PASSWORD}' SUPERUSER"
fi
if [[ -f /tmp/igaming-api.pid ]]; then
  old_pid="$(cat /tmp/igaming-api.pid || true)"
  if [[ -n "${old_pid}" ]] && kill -0 "${old_pid}" 2>/dev/null; then
    kill "${old_pid}" || true
    sleep 1
  fi
fi
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete superwin-backend >/dev/null 2>&1 || true
fi
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'igaming' AND pid <> pg_backend_pid();" || true
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS igaming;"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE igaming OWNER igaming;"

if command -v redis-server >/dev/null 2>&1; then
  if ! redis-cli ping >/dev/null 2>&1; then
    redis-server --daemonize yes --bind 127.0.0.1 --port 6379 || true
  fi
  if redis-cli ping >/dev/null 2>&1; then
    export REDIS_URL="redis://127.0.0.1:6379/0"
    printf '\nREDIS_URL=%s\n' "$REDIS_URL" >> .env
  fi
fi

echo "[5/7] Starting the shared API under PM2..."
pm2 start .venv/bin/uvicorn --name superwin-backend --interpreter none --cwd "$PWD" -- \
  main:app --host 127.0.0.1 --port 8000 --workers 4
pm2 save >/dev/null || true

ready=0
for _ in $(seq 1 40); do
  if curl -sf http://127.0.0.1:8000/health >/dev/null; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "${ready}" -ne 1 ]]; then
  echo "Server did not become ready. PM2 logs:"
  pm2 logs superwin-backend --lines 80 --nostream || true
  exit 1
fi

echo "[6/7] Configuring Nginx..."
sudo cp deploy/nginx/superwin.conf /etc/nginx/sites-available/superwin.conf
sudo ln -sfn /etc/nginx/sites-available/superwin.conf /etc/nginx/sites-enabled/superwin.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
if sudo service nginx status >/dev/null 2>&1; then
  sudo service nginx reload || sudo service nginx restart
else
  sudo service nginx start || sudo nginx
fi
player_code="$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: superwin.bet' http://127.0.0.1/)"
agent_code="$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: superwinagentsystem.admindigi.com' http://127.0.0.1/)"
admin_code="$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: superwinadmin.admindigi.com' http://127.0.0.1/)"
if [[ "${player_code}" != "307" || "${agent_code}" != "307" || "${admin_code}" != "307" ]]; then
  echo "Nginx host routing failed: player=${player_code} agent=${agent_code} admin=${admin_code}"
  exit 1
fi

echo "[7/7] Checking player, agent, admin, and the local casino webhook..."
.venv/bin/python tests/e2e_live.py

echo "---------------------------------------------------"
echo "MASHROUCA WAA DIYAAR! ALL SYSTEMS ARE LIVE & RUNNING."
echo "---------------------------------------------------"
