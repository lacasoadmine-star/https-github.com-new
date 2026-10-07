#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "[1/4] Installing dependencies..."
if ! python3 -c "import ensurepip" >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y python3-venv
fi
rm -rf .venv
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

echo "[2/4] Running unit tests..."
.venv/bin/python -m unittest tests.test_aggregator -v

echo "[3/4] Starting FastAPI server..."
rm -f test_igaming.db test_igaming.db-wal test_igaming.db-shm
if [[ -f /tmp/igaming-api.pid ]]; then
  old_pid="$(cat /tmp/igaming-api.pid || true)"
  if [[ -n "${old_pid}" ]] && kill -0 "${old_pid}" 2>/dev/null; then
    kill "${old_pid}" || true
    sleep 1
  fi
fi
nohup .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 > /tmp/igaming-api.log 2>&1 &
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

echo "[4/4] Running automated HTTP checks..."
OUT_DIR=/tmp/igaming-e2e
mkdir -p "${OUT_DIR}"

curl -sf http://127.0.0.1:8000/health -o "${OUT_DIR}/health.json"
curl -sf -X POST http://127.0.0.1:8000/api/v1/casino/launch-game \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "game_id": "demo_gates"}' \
  -o "${OUT_DIR}/launch.json"
curl -sf -X POST http://127.0.0.1:8000/api/v1/casino/seamless/webhook \
  -H "Content-Type: application/json" \
  -d '{"player_id": 1, "action": "BET", "amount": 10.0, "transaction_id": "tx_test_100"}' \
  -o "${OUT_DIR}/bet.json"
curl -sf -X POST http://127.0.0.1:8000/api/v1/casino/seamless/webhook \
  -H "Content-Type: application/json" \
  -d '{"player_id": 1, "action": "BET", "amount": 10.0, "transaction_id": "tx_test_100"}' \
  -o "${OUT_DIR}/replay.json"
curl -s -X POST http://127.0.0.1:8000/api/v1/casino/seamless/webhook \
  -H "Content-Type: application/json" \
  -d '{"player_id": 1, "action": "BET", "amount": 1000, "transaction_id": "tx_test_short"}' \
  -o "${OUT_DIR}/short.json"
curl -sf -X POST http://127.0.0.1:8000/api/v1/casino/seamless/webhook \
  -H "Content-Type: application/json" \
  -d '{"player_id": 1, "action": "WIN", "amount": 5, "transaction_id": "tx_test_win"}' \
  -o "${OUT_DIR}/win.json"

GAME_PATH=$(.venv/bin/python -c 'import json,sys; print(json.load(open(sys.argv[1]))["game_url"].replace("http://127.0.0.1:8000",""))' "${OUT_DIR}/launch.json")
curl -sf "http://127.0.0.1:8000${GAME_PATH}" -o "${OUT_DIR}/demo.json"

SIG_BODY='{"player_id":1,"action":"BET","amount":"1","transaction_id":"tx_bad_sig"}'
curl -s -o "${OUT_DIR}/bad-sig.json" -w "%{http_code}" \
  -X POST http://127.0.0.1:8000/api/v1/casino/seamless/webhook \
  -H "Content-Type: application/json" \
  -H "X-Signature: deadbeef" \
  -d "${SIG_BODY}" > "${OUT_DIR}/bad-sig.status"

echo "Health Response: $(cat "${OUT_DIR}/health.json")"
echo "Launch Response: $(cat "${OUT_DIR}/launch.json")"
echo "Bet Webhook Response: $(cat "${OUT_DIR}/bet.json")"
echo "Replay Response: $(cat "${OUT_DIR}/replay.json")"
echo "Insufficient Response: $(cat "${OUT_DIR}/short.json")"
echo "Win Response: $(cat "${OUT_DIR}/win.json")"
echo "Demo Response: $(cat "${OUT_DIR}/demo.json")"
echo "Bad signature HTTP: $(cat "${OUT_DIR}/bad-sig.status")"

.venv/bin/python - <<'PY'
import json
import sqlite3
from pathlib import Path

out = Path("/tmp/igaming-e2e")
health = json.loads((out / "health.json").read_text())
launch = json.loads((out / "launch.json").read_text())
bet = json.loads((out / "bet.json").read_text())
replay = json.loads((out / "replay.json").read_text())
short = json.loads((out / "short.json").read_text())
win = json.loads((out / "win.json").read_text())
demo = json.loads((out / "demo.json").read_text())
bad_code = (out / "bad-sig.status").read_text().strip()

assert health["status"] == "ONLINE", health
assert launch["status"] == "SUCCESS", launch
assert "demo_gates" in launch["game_url"], launch
assert bet["status"] == "OK" and bet["balance"] == 90.0, bet
assert replay["balance"] == 90.0, replay
assert short["error_code"] == "INSUFFICIENT_FUNDS", short
assert win["status"] == "OK" and win["balance"] == 95.0, win
assert demo["game_id"] == "demo_gates", demo
assert bad_code == "401", bad_code

balance = sqlite3.connect("test_igaming.db").execute(
    "SELECT balance FROM wallets WHERE user_id = 1"
).fetchone()[0]
tx_count = sqlite3.connect("test_igaming.db").execute(
    "SELECT COUNT(*) FROM transactions"
).fetchone()[0]
assert str(balance) in {"95", "95.0", "95.0000"}, balance
assert tx_count == 2, tx_count
print(f"SQLite balance={balance} transactions={tx_count}")
PY

echo "---------------------------------------------------"
echo "WAA DIYAAR! MASHROUCA WAA SHUQULGELAY."
echo "---------------------------------------------------"
