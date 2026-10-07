import hashlib
import hmac
import json
import os
import tempfile
import threading
import unittest
from decimal import Decimal
from pathlib import Path

_DB_DIR = tempfile.mkdtemp(prefix="igaming-unit-")
os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(_DB_DIR) / "unit.db")
os.environ["CASINO_HMAC_SECRET"] = "test_hmac_secret_456"

import main  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


class AggregatorTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)
        db = main.SessionLocal()
        try:
            db.execute(
                main.text("UPDATE wallets SET balance = :balance WHERE user_id = 1"),
                {"balance": "100.0000"},
            )
            db.execute(main.text("DELETE FROM transactions"))
            db.commit()
        finally:
            db.close()
        main.DEMO_SESSIONS.clear()

    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "ONLINE")
        self.assertEqual(body["database"], "CONNECTED")
        self.assertEqual(body["dialect"], "sqlite")

    def test_launch_and_open_demo_session(self):
        response = self.client.post(
            "/api/v1/casino/launch-game",
            json={"user_id": 1, "game_id": "demo_gates"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "SUCCESS")
        self.assertEqual(body["player_balance"], 100.0)
        self.assertIn("demo_gates", body["game_url"])

        played = self.client.get(body["game_url"].replace("http://127.0.0.1:8000", ""))
        self.assertEqual(played.status_code, 200)
        self.assertEqual(played.json()["game_id"], "demo_gates")
        self.assertEqual(played.json()["mode"], "demo")

    def test_bet_updates_balance_once(self):
        payload = {
            "player_id": 1,
            "action": "BET",
            "amount": "10.0000",
            "transaction_id": "tx_bet_10",
        }
        first = self.client.post("/api/v1/casino/seamless/webhook", json=payload)
        second = self.client.post("/api/v1/casino/seamless/webhook", json=payload)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()["status"], "OK")
        self.assertEqual(first.json()["balance"], 90.0)
        self.assertEqual(second.json()["balance"], 90.0)
        self.assertEqual(self._stored_balance(), Decimal("90.0000"))
        self.assertEqual(self._transaction_count(), 1)

    def test_insufficient_funds_leaves_balance_unchanged(self):
        response = self.client.post(
            "/api/v1/casino/seamless/webhook",
            json={
                "player_id": 1,
                "action": "BET",
                "amount": "150",
                "transaction_id": "tx_too_big",
            },
        )
        self.assertEqual(response.json()["error_code"], "INSUFFICIENT_FUNDS")
        self.assertEqual(response.json()["balance"], 100.0)
        self.assertEqual(self._stored_balance(), Decimal("100.0000"))

    def test_win_credits_balance(self):
        self.client.post(
            "/api/v1/casino/seamless/webhook",
            json={"player_id": 1, "action": "BET", "amount": "10", "transaction_id": "tx_bet"},
        )
        win = self.client.post(
            "/api/v1/casino/seamless/webhook",
            json={"player_id": 1, "action": "WIN", "amount": "25", "transaction_id": "tx_win"},
        )
        self.assertEqual(win.json()["status"], "OK")
        self.assertEqual(win.json()["balance"], 115.0)
        self.assertEqual(self._stored_balance(), Decimal("115.0000"))

    def test_invalid_signature_is_rejected(self):
        response = self.client.post(
            "/api/v1/casino/seamless/webhook",
            content=b'{"player_id":1,"action":"BET","amount":"5","transaction_id":"tx_sig"}',
            headers={"Content-Type": "application/json", "X-Signature": "deadbeef"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(self._stored_balance(), Decimal("100.0000"))

    def test_valid_signature_is_accepted(self):
        body = json.dumps(
            {"player_id": 1, "action": "BET", "amount": "4", "transaction_id": "tx_signed"}
        ).encode()
        signature = hmac.new(b"test_hmac_secret_456", body, hashlib.sha256).hexdigest()
        response = self.client.post(
            "/api/v1/casino/seamless/webhook",
            content=body,
            headers={"Content-Type": "application/json", "X-Signature": signature},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["balance"], 96.0)

    def test_unknown_action_and_missing_player(self):
        unknown = self.client.post(
            "/api/v1/casino/seamless/webhook",
            json={"player_id": 1, "action": "BONUS", "amount": "5", "transaction_id": "tx_bonus"},
        )
        missing = self.client.post(
            "/api/v1/casino/seamless/webhook",
            json={"player_id": 99, "action": "BET", "amount": "5", "transaction_id": "tx_missing"},
        )
        self.assertEqual(unknown.json()["error_code"], "INVALID_ACTION")
        self.assertEqual(missing.json()["error_code"], "USER_NOT_FOUND")
        self.assertEqual(self._stored_balance(), Decimal("100.0000"))

    def test_parallel_bets_cannot_overdraw(self):
        barrier = threading.Barrier(2)
        results = []

        def bet(tx_id: str):
            barrier.wait()
            db = main.SessionLocal()
            try:
                results.append(
                    main.apply_wallet_event(
                        db,
                        {
                            "player_id": 1,
                            "action": "BET",
                            "amount": "60",
                            "transaction_id": tx_id,
                        },
                    )
                )
            finally:
                db.close()

        threads = [
            threading.Thread(target=bet, args=("tx_parallel_a",)),
            threading.Thread(target=bet, args=("tx_parallel_b",)),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        statuses = sorted(item["status"] + ":" + item.get("error_code", "OK") for item in results)
        self.assertEqual(statuses, ["ERROR:INSUFFICIENT_FUNDS", "OK:OK"])
        self.assertEqual(self._stored_balance(), Decimal("40.0000"))
        self.assertEqual(self._transaction_count(), 1)

    def _stored_balance(self) -> Decimal:
        db = main.SessionLocal()
        try:
            row = db.execute(
                main.text("SELECT balance FROM wallets WHERE user_id = 1")
            ).fetchone()
            return Decimal(str(row[0]))
        finally:
            db.close()

    def _transaction_count(self) -> int:
        db = main.SessionLocal()
        try:
            return db.execute(main.text("SELECT COUNT(*) FROM transactions")).scalar()
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
