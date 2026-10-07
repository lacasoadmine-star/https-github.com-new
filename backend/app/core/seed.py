"""Idempotent opening data for the shared database."""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import text

from app.core.security import hash_password
from app.db.session import SessionLocal, engine
from app.core.models import (
    CasinoGame,
    Permission,
    Provider,
    Setting,
    SportEvent,
    User,
    Wallet,
)

PERMISSIONS = {
    "player": [
        "player.dashboard",
        "player.deposit",
        "player.withdraw",
        "player.sports",
        "player.casino",
        "player.wallet",
        "player.history",
        "player.profile",
        "player.notifications",
    ],
    "agent": [
        "agent.dashboard",
        "agent.players",
        "agent.players.create",
        "agent.balance",
        "agent.deposits",
        "agent.withdrawals",
        "agent.transactions",
        "agent.commissions",
        "agent.subagents",
        "agent.reports",
        "agent.notifications",
        "agent.profile",
    ],
    "admin": [
        "admin.dashboard",
        "admin.players",
        "admin.agents",
        "admin.transactions",
        "admin.deposits",
        "admin.withdrawals",
        "admin.sports",
        "admin.casino",
        "admin.providers",
        "admin.commissions",
        "admin.reports",
        "admin.audit",
        "admin.settings",
        "admin.permissions",
    ],
}

EVENTS = [
    ("Cup Final", "League", False, "2.0000", "3.0000", "4.0000"),
    ("City Derby", "League", False, "1.5000", "2.5000", "3.5000"),
    ("Night Match", "Live Board", True, "1.8000", "2.0000", "3.0000"),
]


def _ensure_user(db, username: str, email: str, password: str, role: str, balance: str, agent_id=None, tier=None):
    user = db.query(User).filter(User.username == username).one_or_none()
    if user is None:
        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role=role,
            tier=tier or role,
            agent_id=agent_id,
        )
        db.add(user)
        db.flush()
        db.add(Wallet(user_id=user.id, currency="USD", balance=Decimal(balance)))
    return user


def seed() -> None:
    db = SessionLocal()
    locked = False
    try:
        if engine.dialect.name == "postgresql":
            db.execute(text("SELECT pg_advisory_lock(847261)"))
            locked = True
        _ensure_user(db, "clearing", "clearing@superwin.local", "system-clearing", "system", "0", tier="system")
        _ensure_user(db, "house", "house@superwin.local", "system-house", "system", "1000000.0000", tier="system")
        _ensure_user(db, "escrow", "escrow@superwin.local", "system-escrow", "system", "0", tier="system")
        _ensure_user(db, "admin", "admin@superwin.local", "admin123", "admin", "0", tier="superadmin")
        _ensure_user(db, "financial", "financial@superwin.local", "financial123", "admin", "0", tier="financial")
        _ensure_user(db, "support", "support@superwin.local", "support123", "admin", "0", tier="support")
        master = _ensure_user(db, "master", "master@superwin.local", "master123", "agent", "0", tier="master")
        super_agent = _ensure_user(db, "super", "super@superwin.local", "super123", "agent", "0", tier="super")
        if super_agent.parent_agent_id is None:
            super_agent.parent_agent_id = master.id
        agent = _ensure_user(db, "agent", "agent@superwin.local", "agent123", "agent", "0", tier="agent")
        if agent.parent_agent_id is None:
            agent.parent_agent_id = super_agent.id
        _ensure_user(db, "player", "player@superwin.local", "play123", "player", "0", agent_id=agent.id, tier="player")

        for role, actions in PERMISSIONS.items():
            for action in actions:
                exists = db.query(Permission).filter_by(role=role, action=action).one_or_none()
                if exists is None:
                    db.add(Permission(role=role, action=action, allowed=True))

        if db.get(Setting, "commission_rate") is None:
            db.add(Setting(key="commission_rate", value="0.0500"))

        if db.query(SportEvent).count() == 0:
            for name, league, is_live, home, away, draw in EVENTS:
                db.add(
                    SportEvent(
                        name=name,
                        league=league,
                        is_live=is_live,
                        odds_home=Decimal(home),
                        odds_away=Decimal(away),
                        odds_draw=Decimal(draw),
                        status="open",
                    )
                )

        if db.query(CasinoGame).count() == 0:
            db.add(CasinoGame(code="steady", name="Steady", kind="fixed"))
            db.add(CasinoGame(code="flicker", name="Flicker", kind="chance"))

        if db.query(Provider).count() == 0:
            db.add(Provider(name="Local Sports", kind="sports", status="active"))
            db.add(Provider(name="Local Casino", kind="casino", status="active"))

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        if locked:
            db.execute(text("SELECT pg_advisory_unlock(847261)"))
            db.commit()
        db.close()


def reset_activity() -> None:
    """Return balances and tickets to the seeded baseline. Used by tests."""
    db = SessionLocal()
    try:
        for table in (
            "notifications",
            "audit_logs",
            "casino_rounds",
            "game_launches",
            "sport_bets",
            "withdrawals",
            "deposits",
            "ledger_entries",
        ):
            db.execute(text(f"DELETE FROM {table}"))
        db.execute(text("UPDATE wallets SET balance = 0"))
        db.execute(
            text(
                """
                UPDATE wallets
                SET balance = :balance
                WHERE user_id = (SELECT id FROM users WHERE username = 'house')
                """
            ),
            {"balance": "1000000.0000"},
        )
        db.execute(text("UPDATE users SET status = 'active', credit_limit = NULL WHERE role != 'system'"))
        db.execute(text("UPDATE sport_events SET status = 'open', result = NULL"))
        for row in db.query(Permission).all():
            row.allowed = True
        setting = db.get(Setting, "commission_rate")
        if setting is not None:
            setting.value = "0.0500"
        db.commit()
    finally:
        db.close()
