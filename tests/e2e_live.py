"""Hit the running server and prove the three portals share one ledger."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import urllib.error
import urllib.request


BASE = "http://127.0.0.1:8000"


def request(
    path: str,
    method: str = "GET",
    body: dict | None = None,
    token: str | None = None,
    raw: bytes | None = None,
    extra_headers: dict | None = None,
):
    data = raw if raw is not None else (None if body is None else json.dumps(body).encode())
    headers = {"Content-Type": "application/json"}
    if extra_headers:
        headers.update(extra_headers)
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            raw = response.read().decode()
            return response.status, json.loads(raw) if raw.startswith("{") or raw.startswith("[") else raw
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = raw
        return exc.code, parsed


def main() -> None:
    status, health = request("/health")
    assert status == 200 and health["status"] == "ONLINE", health
    assert health["dialect"] == "postgresql", health

    status, player_html = request("/player/wallet")
    status_agent, agent_html = request("/agent/deposits")
    status_admin, admin_html = request("/admin/withdrawals")
    assert status == status_agent == status_admin == 200
    assert "Superwin" in player_html and "Superwin Agents" not in player_html
    assert "Superwin Agents" in agent_html and "Player board" not in agent_html
    assert "Superwin Control" in admin_html and "Superwin Agents" not in admin_html
    assert 'href="/player/withdraw"' in player_html
    assert 'href="/agent/reports"' in agent_html
    assert 'href="/admin/audit-logs"' in admin_html

    _, player = request("/api/auth/login", "POST", {"username": "player", "password": "play123", "portal": "player"})
    _, agent = request("/api/auth/login", "POST", {"username": "agent", "password": "agent123", "portal": "agent"})
    _, admin = request("/api/auth/login", "POST", {"username": "admin", "password": "admin123", "portal": "admin"})
    denied, _ = request("/api/admin/deposits", token=player["token"])
    assert denied == 403

    status, deposit = request("/api/player/deposit", "POST", {"amount": "80"}, player["token"])
    assert status == 200 and deposit["balance"] == "80.0000", deposit
    _, agent_deposits = request("/api/agent/deposits", token=agent["token"])
    _, admin_deposits = request("/api/admin/deposits", token=admin["token"])
    assert agent_deposits["items"][0]["amount"] == "80.0000"
    assert admin_deposits["items"][0]["username"] == "player"

    _, events = request("/api/player/sports?live=false", token=player["token"])
    cup = next(item for item in events["items"] if item["name"] == "Cup Final")
    status, bet = request(
        "/api/player/sports/bets",
        "POST",
        {"event_id": cup["id"], "selection": "home", "stake": "10"},
        player["token"],
    )
    assert status == 200 and bet["balance"] == "70.0000", bet
    status, settled = request(f"/api/admin/sports/{cup['id']}/settle", "POST", {"result": "home"}, admin["token"])
    assert status == 200, settled
    _, wallet = request("/api/player/wallet", token=player["token"])
    assert wallet["balance"] == "90.0000", wallet

    status, played = request(
        "/api/player/casino/play",
        "POST",
        {"game_code": "steady", "stake": "5"},
        player["token"],
    )
    assert status == 200 and played["balance"] == "95.0000", played
    _, total = request("/api/admin/conservation", token=admin["token"])
    assert total["total"] == "1000000.0000", total

    status, launched = request(
        "/api/v1/casino/launch-game",
        "POST",
        {"game_code": "steady"},
        player["token"],
    )
    assert status == 200 and launched["launch_url"].startswith("/player/casino?session="), launched
    assert "http" not in launched["launch_url"]
    denied, _ = request("/api/v1/casino/launch-game", "POST", {"game_code": "steady"}, agent["token"])
    assert denied == 403
    secret = os.environ["CASINO_HMAC_SECRET"].encode()
    bet_raw = json.dumps(
        {
            "session_id": launched["session_id"],
            "transaction_id": "live-bet-1",
            "action": "BET",
            "amount": "5",
        }
    ).encode()
    signature = hmac.new(secret, bet_raw, hashlib.sha256).hexdigest()
    status, webhook = request(
        "/api/v1/casino/seamless/webhook",
        "POST",
        raw=bet_raw,
        extra_headers={"X-Signature": signature},
    )
    assert status == 200 and webhook["balance"] == "90.0000", webhook
    _, total = request("/api/admin/conservation", token=admin["token"])
    assert total["total"] == "1000000.0000", total
    print("LIVE_OK", health["dialect"], wallet["balance"], played["balance"], webhook["balance"], total["total"])


if __name__ == "__main__":
    main()
