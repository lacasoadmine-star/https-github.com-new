"""Shared tables. Portals do not keep private databases."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase

MONEY = Decimal("0.0001")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False)
    tier = Column(String(20), nullable=False, default="player")
    status = Column(String(20), nullable=False, default="active")
    credit_limit = Column(Numeric(18, 4))
    agent_id = Column(Integer)
    parent_agent_id = Column(Integer)
    created_at = Column(DateTime, default=utcnow)


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, unique=True, nullable=False)
    currency = Column(String(10), nullable=False, default="USD")
    balance = Column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    updated_at = Column(DateTime, default=utcnow)


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(String(36), primary_key=True)
    reference = Column(String(120), unique=True, nullable=False)
    reason = Column(String(40), nullable=False)
    amount = Column(Numeric(18, 4), nullable=False)
    debit_user_id = Column(Integer, nullable=False)
    credit_user_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=utcnow)


class SessionToken(Base):
    __tablename__ = "sessions"

    token = Column(String(80), primary_key=True)
    user_id = Column(Integer, nullable=False)
    portal = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=utcnow)


class SportEvent(Base):
    __tablename__ = "sport_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(120), nullable=False)
    league = Column(String(80), nullable=False)
    is_live = Column(Boolean, nullable=False, default=False)
    odds_home = Column(Numeric(8, 4), nullable=False)
    odds_away = Column(Numeric(8, 4), nullable=False)
    odds_draw = Column(Numeric(8, 4), nullable=False)
    status = Column(String(20), nullable=False, default="open")
    result = Column(String(20))


class SportBet(Base):
    __tablename__ = "sport_bets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    event_id = Column(Integer, nullable=False)
    selection = Column(String(20), nullable=False)
    stake = Column(Numeric(18, 4), nullable=False)
    odds = Column(Numeric(8, 4), nullable=False)
    status = Column(String(20), nullable=False, default="open")
    reference = Column(String(120), unique=True, nullable=False)
    created_at = Column(DateTime, default=utcnow)


class CasinoGame(Base):
    __tablename__ = "casino_games"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(40), unique=True, nullable=False)
    name = Column(String(80), nullable=False)
    kind = Column(String(20), nullable=False)


class GameLaunch(Base):
    __tablename__ = "game_launches"

    id = Column(String(48), primary_key=True)
    user_id = Column(Integer, nullable=False)
    game_code = Column(String(40), nullable=False)
    created_at = Column(DateTime, default=utcnow)


class CasinoRound(Base):
    __tablename__ = "casino_rounds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    game_code = Column(String(40), nullable=False)
    stake = Column(Numeric(18, 4), nullable=False)
    payout = Column(Numeric(18, 4), nullable=False)
    reference = Column(String(120), unique=True, nullable=False)
    created_at = Column(DateTime, default=utcnow)


class Deposit(Base):
    __tablename__ = "deposits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    agent_id = Column(Integer)
    amount = Column(Numeric(18, 4), nullable=False)
    reference = Column(String(120), unique=True, nullable=False)
    created_at = Column(DateTime, default=utcnow)


class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    agent_id = Column(Integer)
    amount = Column(Numeric(18, 4), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    reference = Column(String(120), unique=True, nullable=False)
    created_at = Column(DateTime, default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    kind = Column(String(40), nullable=False)
    title = Column(String(120), nullable=False)
    body = Column(String(300), nullable=False)
    read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_id = Column(Integer)
    action = Column(String(80), nullable=False)
    detail = Column(String(300), nullable=False)
    created_at = Column(DateTime, default=utcnow)


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(60), primary_key=True)
    value = Column(String(120), nullable=False)


class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = (UniqueConstraint("role", "action", name="uq_role_action"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    role = Column(String(20), nullable=False)
    action = Column(String(60), nullable=False)
    allowed = Column(Boolean, nullable=False, default=True)


class Provider(Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(80), unique=True, nullable=False)
    kind = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False, default="inactive")
