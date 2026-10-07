import json
import os
import sys
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

_DB = Path(tempfile.mkdtemp(prefix="superwin-")) / "unit.db"
os.environ["DATABASE_URL"] = "sqlite:///" + str(_DB)
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.main import app as fastapi_app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from app.core.seed import reset_activity  # noqa: E402
from app.core.services import conservation  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402


class PlatformTests(unittest.TestCase):
    def setUp(self):
        reset_activity()
        self.client = TestClient(fastapi_app)

    def auth(self, username, password, portal):
        response = self.client.post(
            "/api/auth/login",
            json={"username": username, "password": password, "portal": portal},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": "Bearer " + response.json()["token"]}

    def test_health_and_separate_pages(self):
        health = self.client.get("/health")
        self.assertEqual(health.json()["status"], "ONLINE")
        self.assertEqual(health.json()["dialect"], "sqlite")

        player = self.client.get("/player/sports").text
        agent = self.client.get("/agent/commissions").text
        admin = self.client.get("/admin/permissions").text
        gate = self.client.get("/").text

        self.assertIn("Superwin", player)
        self.assertIn("superwin.bet", player)
        self.assertIn('href="/player/casino"', player)
        self.assertIn('href="/player/deposit"', player)
        self.assertNotIn("Superwin Agents", player)
        self.assertNotIn("Superwin Control", player)
        self.assertNotIn('href="/agent/', player)
        self.assertNotIn('href="/admin/', player)

        self.assertIn("Superwin Agents", agent)
        self.assertIn("superwinagentsystem.admindigi.com", agent)
        self.assertIn('href="/agent/sub-agents"', agent)
        self.assertNotIn("Superwin Control", agent)
        self.assertNotIn("Player board", agent)
        self.assertNotIn('href="/player/', agent)

        self.assertIn("Superwin Control", admin)
        self.assertIn("superwinadmin.admindigi.com", admin)
        self.assertIn('href="/admin/audit-logs"', admin)
        self.assertIn('href="/admin/providers"', admin)
        self.assertNotIn("Superwin Agents", admin)
        self.assertNotIn("Player board", admin)

        self.assertIn('href="/player/login"', gate)
        self.assertIn('href="/agent/login"', gate)
        self.assertIn('href="/admin/login"', gate)
        self.assertNotIn("house_balance", gate)

    def test_login_is_portal_specific(self):
        wrong = self.client.post(
            "/api/auth/login",
            json={"username": "agent", "password": "agent123", "portal": "player"},
        )
        self.assertEqual(wrong.status_code, 401)
        player = self.auth("player", "play123", "player")
        blocked = self.client.get("/api/agent/dashboard", headers=player)
        self.assertEqual(blocked.status_code, 403)
        blocked_admin = self.client.get("/api/admin/players", headers=player)
        self.assertEqual(blocked_admin.status_code, 403)

    def test_deposit_is_visible_to_agent_admin_and_socket(self):
        player = self.auth("player", "play123", "player")
        agent = self.auth("agent", "agent123", "agent")
        admin = self.auth("admin", "admin123", "admin")
        with self.client.websocket_connect("/ws/agent?token=" + agent["Authorization"].split()[1]) as socket:
            first = self.client.post(
                "/api/player/deposit",
                headers=player,
                json={"amount": "100", "client_reference": "dep-1"},
            )
            self.assertEqual(first.status_code, 200, first.text)
            self.assertEqual(first.json()["balance"], "100.0000")
            message = socket.receive_json()
            self.assertEqual(message["type"], "deposit")
            self.assertEqual(message["amount"], "100.0000")
        second = self.client.post(
            "/api/player/deposit",
            headers=player,
            json={"amount": "100", "client_reference": "dep-1"},
        )
        self.assertEqual(second.json()["balance"], "100.0000")
        agent_rows = self.client.get("/api/agent/deposits", headers=agent).json()["items"]
        admin_rows = self.client.get("/api/admin/deposits", headers=admin).json()["items"]
        self.assertEqual(agent_rows[0]["username"], "player")
        self.assertEqual(agent_rows[0]["amount"], "100.0000")
        self.assertEqual(admin_rows[0]["amount"], "100.0000")
        notes = self.client.get("/api/player/notifications", headers=player).json()["items"]
        self.assertTrue(any(item["kind"] == "deposit" for item in notes))
        self.assertEqual(self._total(), "1000000.0000")

    def test_sports_win_and_casino_keep_one_ledger(self):
        player = self.auth("player", "play123", "player")
        admin = self.auth("admin", "admin123", "admin")
        self.client.post("/api/player/deposit", headers=player, json={"amount": "100"})
        events = self.client.get("/api/player/sports?live=false", headers=player).json()["items"]
        cup = next(item for item in events if item["name"] == "Cup Final")
        bet = self.client.post(
            "/api/player/sports/bets",
            headers=player,
            json={"event_id": cup["id"], "selection": "home", "stake": "10"},
        )
        self.assertEqual(bet.status_code, 200, bet.text)
        self.assertEqual(bet.json()["balance"], "90.0000")
        settled = self.client.post(
            f"/api/admin/sports/{cup['id']}/settle",
            headers=admin,
            json={"result": "home"},
        )
        self.assertEqual(settled.status_code, 200, settled.text)
        wallet = self.client.get("/api/player/wallet", headers=player).json()
        self.assertEqual(wallet["balance"], "110.0000")
        played = self.client.post(
            "/api/player/casino/play",
            headers=player,
            json={"game_code": "steady", "stake": "5"},
        )
        self.assertEqual(played.json()["payout"], "10.0000")
        self.assertEqual(played.json()["balance"], "115.0000")
        denied = self.client.post(
            f"/api/admin/sports/{cup['id']}/settle",
            headers=player,
            json={"result": "home"},
        )
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(self._total(), "1000000.0000")

    def test_loss_pays_agent_commission_and_hides_other_agents(self):
        player = self.auth("player", "play123", "player")
        agent = self.auth("agent", "agent123", "agent")
        admin = self.auth("admin", "admin123", "admin")
        self.client.post(
            "/api/admin/settings",
            headers=admin,
            json={"key": "commission_rate", "value": "0.10"},
        )
        self.client.post("/api/player/deposit", headers=player, json={"amount": "100"})
        events = self.client.get("/api/player/sports", headers=player).json()["items"]
        cup = next(item for item in events if item["name"] == "Cup Final")
        self.client.post(
            "/api/player/sports/bets",
            headers=player,
            json={"event_id": cup["id"], "selection": "away", "stake": "10"},
        )
        self.client.post(
            f"/api/admin/sports/{cup['id']}/settle",
            headers=admin,
            json={"result": "home"},
        )
        desk = self.client.get("/api/agent/dashboard", headers=agent).json()
        self.assertEqual(desk["commission_total"], "1.0000")
        self.assertEqual(self.client.get("/api/player/wallet", headers=player).json()["balance"], "90.0000")
        created = self.client.post(
            "/api/admin/agents",
            headers=admin,
            json={"username": "agent2", "email": "agent2@superwin.local", "password": "agent123"},
        )
        self.assertEqual(created.status_code, 200, created.text)
        other = self.auth("agent2", "agent123", "agent")
        own_players = self.client.get("/api/agent/players", headers=agent).json()["items"]
        other_players = self.client.get("/api/agent/players", headers=other).json()["items"]
        self.assertEqual([row["username"] for row in own_players], ["player"])
        self.assertEqual(other_players, [])
        self.assertEqual(self._total(), "1000000.0000")

    def test_withdrawal_approval_and_permission_gate(self):
        player = self.auth("player", "play123", "player")
        agent = self.auth("agent", "agent123", "agent")
        admin = self.auth("admin", "admin123", "admin")
        self.client.post("/api/player/deposit", headers=player, json={"amount": "100"})
        request = self.client.post("/api/player/withdraw", headers=player, json={"amount": "40"})
        self.assertEqual(request.json()["status"], "pending")
        self.assertEqual(request.json()["balance"], "60.0000")
        pending = self.client.get("/api/agent/withdrawals", headers=agent).json()["items"]
        self.assertEqual(pending[0]["status"], "pending")
        approved = self.client.post(
            f"/api/admin/withdrawals/{pending[0]['id']}/approve",
            headers=admin,
        )
        self.assertEqual(approved.status_code, 200, approved.text)
        self.assertEqual(self.client.get("/api/player/wallet", headers=player).json()["balance"], "60.0000")
        closed = self.client.post(
            "/api/admin/permissions",
            headers=admin,
            json={"role": "player", "action": "player.deposit", "allowed": False},
        )
        self.assertEqual(closed.status_code, 200, closed.text)
        denied = self.client.post("/api/player/deposit", headers=player, json={"amount": "5"})
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(self._total(), "1000000.0000")

    def test_launch_game_and_signed_webhook_stay_on_the_ledger(self):
        from app.api.v1.casino_routes import sign_body

        player = self.auth("player", "play123", "player")
        agent = self.auth("agent", "agent123", "agent")
        self.client.post("/api/player/deposit", headers=player, json={"amount": "100"})
        blocked = self.client.post(
            "/api/v1/casino/launch-game",
            headers=agent,
            json={"game_code": "steady"},
        )
        self.assertEqual(blocked.status_code, 403)
        launched = self.client.post(
            "/api/v1/casino/launch-game",
            headers=player,
            json={"game_code": "steady"},
        )
        self.assertEqual(launched.status_code, 200, launched.text)
        body = launched.json()
        self.assertTrue(body["launch_url"].startswith("/player/casino?session="))
        self.assertNotIn("http", body["launch_url"])
        missing = self.client.post(
            "/api/v1/casino/launch-game",
            headers=player,
            json={"game_code": "remote-slot"},
        )
        self.assertEqual(missing.status_code, 404)

        def post_webhook(payload, signature):
            raw = json.dumps(payload).encode()
            return self.client.post(
                "/api/v1/casino/seamless/webhook",
                content=raw,
                headers={"X-Signature": signature, "Content-Type": "application/json"},
            )

        bet_payload = {
            "session_id": body["session_id"],
            "transaction_id": "tx-1",
            "action": "BET",
            "amount": "10",
        }
        bet_raw = json.dumps(bet_payload).encode()
        bet = post_webhook(bet_payload, sign_body(bet_raw))
        self.assertEqual(bet.status_code, 200, bet.text)
        self.assertEqual(bet.json()["balance"], "90.0000")
        self.assertTrue(bet.json()["applied"])
        replay = post_webhook(bet_payload, sign_body(bet_raw))
        self.assertEqual(replay.status_code, 200, replay.text)
        self.assertFalse(replay.json()["applied"])
        self.assertEqual(replay.json()["balance"], "90.0000")
        forged = post_webhook(bet_payload, "deadbeef")
        self.assertEqual(forged.status_code, 401)
        win_payload = {
            "session_id": body["session_id"],
            "transaction_id": "tx-2",
            "action": "WIN",
            "amount": "4",
        }
        win_raw = json.dumps(win_payload).encode()
        win = post_webhook(win_payload, sign_body(win_raw))
        self.assertEqual(win.status_code, 200, win.text)
        self.assertEqual(win.json()["balance"], "94.0000")
        broke = post_webhook(
            {
                "session_id": body["session_id"],
                "transaction_id": "tx-3",
                "action": "BET",
                "amount": "10000",
            },
            sign_body(
                json.dumps(
                    {
                        "session_id": body["session_id"],
                        "transaction_id": "tx-3",
                        "action": "BET",
                        "amount": "10000",
                    }
                ).encode()
            ),
        )
        self.assertEqual(broke.status_code, 409)
        self.assertEqual(self._total(), "1000000.0000")

        home = self.client.get("/", headers={"host": "superwin.bet"}, follow_redirects=False)
        self.assertEqual(home.status_code, 307)
        self.assertEqual(home.headers["location"], "/player")

    def _total(self) -> str:
        db = SessionLocal()
        try:
            return conservation(db)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
