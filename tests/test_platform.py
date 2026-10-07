import json
import os
import sys
from unittest.mock import patch
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
        self.assertEqual(health.json()["checket"], "UNSET")
        self.assertEqual(health.json()["telegram"], "UNSET")
        self.assertEqual(health.json()["telebirr_account"], "0999999138")
        self.assertNotIn("live", health.json())

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
        self.assertIn('href="/agent/credit"', agent)
        self.assertIn('href="/agent/hierarchy"', agent)
        self.assertNotIn("Superwin Control", agent)
        self.assertNotIn("Player board", agent)
        self.assertNotIn('href="/player/', agent)

        self.assertIn("Superwin Control", admin)
        self.assertIn("superwinadmin.admindigi.com", admin)
        self.assertIn('href="/admin/audit-logs"', admin)
        self.assertIn('href="/admin/gateway"', admin)
        self.assertIn('href="/admin/bans"', admin)
        self.assertIn('href="/admin/bets"', admin)
        self.assertIn('href="/admin/providers"', admin)
        self.assertNotIn("Superwin Agents", admin)
        self.assertNotIn("Player board", admin)

        self.assertIn('href="/player/login"', gate)
        self.assertIn('href="/agent/login"', gate)
        self.assertIn('href="/admin/login"', gate)
        self.assertNotIn("house_balance", gate)

        boot = Path(__file__).resolve().parents[1] / "apps/player/src/boot.ts"
        player_boot = boot.read_text()
        self.assertIn('channel: "telebirr"', player_boot)
        self.assertNotIn('"local"', player_boot)
        self.assertIn("0999999138", player_boot)
        script = (Path(__file__).resolve().parents[1] / "setup_and_run.sh").read_text()
        self.assertNotIn('export JWT_SECRET="superwin_jwt_secret_key_prod_2026"', script)
        self.assertNotIn("ALL SYSTEMS ARE LIVE", script)

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

    def test_tier_desks_limit_credit_finance_and_bans(self):
        master = self.auth("master", "master123", "agent")
        desk = self.auth("agent", "agent123", "agent")
        financial = self.auth("financial", "financial123", "admin")
        support = self.auth("support", "support123", "admin")
        player = self.auth("player", "play123", "player")

        blocked = self.client.post(
            "/api/agent/sub-agents",
            headers=desk,
            json={"username": "desk2", "email": "desk2@superwin.local", "password": "desk2123"},
        )
        self.assertEqual(blocked.status_code, 403)
        created = self.client.post(
            "/api/agent/sub-agents",
            headers=master,
            json={"username": "desk2", "email": "desk2@superwin.local", "password": "desk2123"},
        )
        self.assertEqual(created.status_code, 200, created.text)
        tree = self.client.get("/api/agent/hierarchy", headers=master).json()
        self.assertEqual(tree["tier"], "master")
        self.assertIn("super", [child["username"] for child in tree["children"]])

        limited = self.client.post(
            "/api/agent/credit",
            headers=master,
            json={"username": "agent", "credit_limit": "30"},
        )
        self.assertEqual(limited.status_code, 200, limited.text)
        denied_credit = self.client.post(
            "/api/agent/credit",
            headers=desk,
            json={"username": "agent", "credit_limit": "10"},
        )
        self.assertEqual(denied_credit.status_code, 403)
        over = self.client.post("/api/player/deposit", headers=player, json={"amount": "40"})
        self.assertEqual(over.status_code, 409, over.text)
        posted = self.client.post("/api/player/deposit", headers=player, json={"amount": "20"})
        self.assertEqual(posted.status_code, 200, posted.text)
        request = self.client.post("/api/player/withdraw", headers=player, json={"amount": "5"})
        self.assertEqual(request.status_code, 200, request.text)
        withdrawal_id = request.json()["id"]
        support_no = self.client.post(f"/api/admin/withdrawals/{withdrawal_id}/approve", headers=support)
        self.assertEqual(support_no.status_code, 403)
        approved = self.client.post(f"/api/admin/withdrawals/{withdrawal_id}/approve", headers=financial)
        self.assertEqual(approved.status_code, 200, approved.text)
        gateway = self.client.get("/api/admin/gateway", headers=financial)
        self.assertEqual(gateway.status_code, 200, gateway.text)
        self.assertEqual(gateway.json()["casino_webhook"], "LOCAL")
        self.assertEqual(gateway.json()["telebirr_account"], "0999999138")
        self.assertEqual(gateway.json()["checket"], "UNSET")
        self.assertNotIn("live", gateway.json())
        self.assertEqual(self.client.get("/api/admin/gateway", headers=support).status_code, 403)
        self.assertEqual(self.client.get("/api/admin/audit-logs", headers=support).status_code, 403)

        banned = self.client.post(
            "/api/admin/users/status",
            headers=support,
            json={"username": "player", "status": "banned"},
        )
        self.assertEqual(banned.status_code, 200, banned.text)
        finance_ban = self.client.post(
            "/api/admin/users/status",
            headers=financial,
            json={"username": "player", "status": "active"},
        )
        self.assertEqual(finance_ban.status_code, 403)
        locked = self.client.post(
            "/api/auth/login",
            json={"username": "player", "password": "play123", "portal": "player"},
        )
        self.assertEqual(locked.status_code, 403)
        history = self.client.get("/api/admin/bets", headers=support)
        self.assertEqual(history.status_code, 200, history.text)
        self.assertEqual(self.client.get("/api/admin/bets", headers=financial).status_code, 403)
        self.assertEqual(self._total(), "1000000.0000")

    def test_telebirr_deposit_fails_honestly_without_checket_key(self):
        player = self.auth("player", "play123", "player")
        os.environ.pop("CHECK_ET_API_KEY", None)
        denied = self.client.post(
            "/api/player/deposit",
            headers=player,
            json={"amount": "25", "client_reference": "NOKEY", "channel": "telebirr"},
        )
        self.assertEqual(denied.status_code, 503, denied.text)
        self.assertIn("Check.et", denied.json()["detail"])
        self.assertEqual(self._total(), "1000000.0000")

    def test_telebirr_deposit_credits_only_a_matching_receipt(self):
        from decimal import Decimal
        from fastapi import HTTPException
        from app.core.payments import verify_telebirr

        player = self.auth("player", "play123", "player")
        os.environ["CHECK_ET_API_KEY"] = "chk_test"
        os.environ["TELEBIRR_ACCOUNT"] = "0999999138"
        receipt = {
            "success": True,
            "exists": True,
            "duplicate": False,
            "data": {
                "receipt": {
                    "status": "completed",
                    "amount": 25,
                    "currency": "ETB",
                    "receiver_phone": "0999999138",
                    "payer_name": "Abebe",
                }
            },
        }

        class Response:
            status_code = 200

            def json(self):
                return receipt

        with patch("app.core.payments.httpx.post", return_value=Response()):
            verified = verify_telebirr("DEL25OK", Decimal("25"))
        self.assertEqual(verified["amount"], Decimal("25.0000"))
        receipt["data"]["receipt"]["amount"] = 10
        with patch("app.core.payments.httpx.post", return_value=Response()):
            with self.assertRaises(HTTPException) as wrong_amount:
                verify_telebirr("DEL25BAD", Decimal("25"))
        self.assertEqual(wrong_amount.exception.status_code, 409)
        receipt["data"]["receipt"]["amount"] = 25
        receipt["data"]["receipt"]["receiver_phone"] = "0911000000"
        with patch("app.core.payments.httpx.post", return_value=Response()):
            with self.assertRaises(HTTPException) as wrong_account:
                verify_telebirr("DEL25ACCT", Decimal("25"))
        self.assertEqual(wrong_account.exception.status_code, 409)

        def fake_verify(reference, amount):
            return {"amount": Decimal("25.0000"), "currency": "ETB", "payer": "Abebe", "reference": reference}

        with patch("app.core.payments.verify_telebirr", side_effect=fake_verify) as called:
            first = self.client.post(
                "/api/player/deposit",
                headers=player,
                json={"amount": "25", "client_reference": "DEL25OK", "channel": "telebirr"},
            )
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(first.json()["balance"], "25.0000")
        self.assertEqual(first.json()["currency"], "ETB")
        self.assertNotIn("telegram", first.json())
        called.assert_called_once()
        with patch("app.core.payments.verify_telebirr", side_effect=fake_verify) as again:
            second = self.client.post(
                "/api/player/deposit",
                headers=player,
                json={"amount": "25", "client_reference": "DEL25OK", "channel": "telebirr"},
            )
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual(second.json()["balance"], "25.0000")
        again.assert_not_called()
        self.assertEqual(self._total(), "1000000.0000")
        os.environ.pop("CHECK_ET_API_KEY", None)
        os.environ.pop("TELEBIRR_ACCOUNT", None)

    def test_withdrawal_lists_telebirr_destination(self):
        player = self.auth("player", "play123", "player")
        agent = self.auth("agent", "agent123", "agent")
        self.client.post("/api/player/deposit", headers=player, json={"amount": "40"})
        request = self.client.post(
            "/api/player/withdraw",
            headers=player,
            json={"amount": "10", "client_reference": "0911223344"},
        )
        self.assertEqual(request.status_code, 200, request.text)
        rows = self.client.get("/api/agent/withdrawals", headers=agent).json()["items"]
        self.assertEqual(rows[0]["destination"], "0911223344")
        history = self.client.get("/api/player/history", headers=player).json()["withdrawals"]
        self.assertEqual(history[0]["destination"], "0911223344")
        self.assertEqual(self._total(), "1000000.0000")

    def _total(self) -> str:
        db = SessionLocal()
        try:
            return conservation(db)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
