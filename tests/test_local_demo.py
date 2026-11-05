"""Exercise the local launcher without using any existing database."""
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
from decimal import Decimal

import httpx


def test_local_demo_isolated_wallet_and_disabled_payments(tmp_path):
    root = Path(__file__).resolve().parents[1]
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    protected_db = tmp_path / "must-not-be-created.db"
    env = dict(os.environ, DATABASE_URL="sqlite:///" + str(protected_db),
               TELEGRAM_BOT_TOKEN="must-not-be-used", CHECK_ET_API_KEY="must-not-be-used")
    process = subprocess.Popen(
        [sys.executable, "scripts/local_demo.py", "--demo", "--port", str(port)],
        cwd=root, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=2, trust_env=False) as client:
            for _ in range(100):
                assert process.poll() is None, "Demo process exited during startup"
                try:
                    health = client.get("/health")
                    if health.status_code == 200:
                        break
                except httpx.TransportError:
                    pass
                time.sleep(0.1)
            else:
                raise AssertionError("Demo did not start")
            assert health.json()["checket"] == "UNSET"
            assert health.json()["telegram"] == "UNSET"
            for path in ["/local", "/player", "/agent", "/admin"]:
                assert client.get(path).status_code == 200
            assert client.get("/api/player/wallet").status_code in {401, 403}
            login = client.post("/api/auth/login", json={
                "username": "player", "password": "play123", "portal": "player",
            })
            assert login.status_code == 200
            client.headers["Authorization"] = "Bearer " + login.json()["token"]
            wallet = client.get("/api/player/wallet").json()
            assert Decimal(wallet["balance"]) == 1000
            round_result = client.post("/api/player/casino/play", json={"game_code": "steady", "stake": "10"})
            assert round_result.status_code == 200
            assert Decimal(round_result.json()["balance"]) == 1010
            assert Decimal(round_result.json()["payout"]) == 20
            denied = client.post("/api/player/casino/play", json={"game_code": "steady", "stake": "9999999"})
            assert denied.status_code >= 400
            for path in ["/api/player/deposit", "/api/player/withdraw", "/api/auth/register"]:
                assert client.post(path, json={"amount": "100"}).status_code == 403
            wallet = client.get("/api/player/wallet").json()
            assert Decimal(wallet["balance"]) == 1010
            assert {row["reason"] for row in wallet["items"]} >= {"casino_bet", "casino_win", "local_demo_credit"}
            assert not protected_db.exists()
    finally:
        process.terminate()
        process.wait(timeout=10)


def test_local_demo_requires_explicit_opt_in():
    result = subprocess.run([sys.executable, "scripts/local_demo.py"],
                            cwd=Path(__file__).resolve().parents[1], capture_output=True)
    assert result.returncode == 2
    assert b"--demo" in result.stderr
