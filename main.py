"""Local iGaming wallet gateway.

SQLite is the default database. Set DATABASE_URL to a PostgreSQL URL to use
PostgreSQL instead. Game launch stays on this machine: the process does not
call an external casino.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from urllib.parse import quote

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    Numeric,
    String,
    create_engine,
    event,
    text,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DB_URL = os.getenv("DATABASE_URL", "sqlite:///./test_igaming.db")
CASINO_HMAC_SECRET = os.getenv("CASINO_HMAC_SECRET", "test_hmac_secret_456")
STARTING_BALANCE = Decimal("100.0000")
MONEY = Decimal("0.0001")
ALLOWED_ACTIONS = {"BET", "WIN"}

connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}
engine = create_engine(DB_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

if engine.dialect.name == "sqlite":

    @event.listens_for(engine, "connect")
    def _sqlite_connect(dbapi_connection, _connection_record) -> None:
        # Let SQLAlchemy emit BEGIN IMMEDIATE so concurrent bets lock in order.
        dbapi_connection.isolation_level = None
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    @event.listens_for(engine, "begin")
    def _sqlite_begin(conn) -> None:
        conn.exec_driver_sql("BEGIN IMMEDIATE")


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, unique=True, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    balance = Column(Numeric(18, 4), default=STARTING_BALANCE, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True)
    wallet_id = Column(Integer, nullable=False)
    amount = Column(Numeric(18, 4), nullable=False)
    type = Column(String(50), nullable=False)
    reference_id = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db() -> None:
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            db.add(User(id=1, username="test_player", email="test@example.com"))
            db.add(
                Wallet(
                    user_id=1,
                    currency="USD",
                    balance=STARTING_BALANCE,
                )
            )
            db.commit()
    finally:
        db.close()


init_db()

app = FastAPI(title="Local iGaming Wallet Gateway")
DEMO_SESSIONS: dict[str, dict[str, str | int]] = {}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class LaunchGameRequest(BaseModel):
    user_id: int = Field(..., ge=1)
    game_id: str = Field(..., min_length=1, max_length=120)
    currency: str = "USD"
    ip_address: str = "127.0.0.1"


def _money(value: object) -> Decimal:
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Amount-ka ma aha nambar sax ah.") from exc
    if not amount.is_finite():
        raise HTTPException(status_code=400, detail="Amount-ka ma aha nambar sax ah.")
    return amount.quantize(MONEY)


def _balance_payload(balance: Decimal, currency: str, transaction_id: str) -> dict:
    return {
        "status": "OK",
        "balance": float(balance),
        "currency": currency,
        "transaction_id": transaction_id,
    }


def _wallet_row(db: Session, user_id: int):
    return db.execute(
        text("SELECT id, balance, currency FROM wallets WHERE user_id = :user_id"),
        {"user_id": user_id},
    ).fetchone()


def apply_wallet_event(db: Session, payload: dict) -> dict:
    """Apply one BET or WIN exactly once.

    The balance change and the transaction row commit together. A repeated
    transaction_id returns the current balance and does not move funds again.
    BET uses a conditional update so the balance cannot fall below zero.
    """
    user_id = int(payload.get("player_id", 1))
    action = str(payload.get("action", "")).upper()
    amount = _money(payload.get("amount", "0"))
    currency = str(payload.get("currency") or "USD")
    transaction_id = str(payload.get("transaction_id") or secrets.token_hex(16))

    if action not in ALLOWED_ACTIONS:
        return {"status": "ERROR", "error_code": "INVALID_ACTION", "balance": 0.0}
    if amount <= 0:
        return {"status": "ERROR", "error_code": "INVALID_AMOUNT", "balance": 0.0}

    try:
        existing = db.execute(
            text(
                """
                SELECT w.balance, w.currency
                FROM transactions AS t
                JOIN wallets AS w ON w.id = t.wallet_id
                WHERE t.reference_id = :reference_id
                """
            ),
            {"reference_id": transaction_id},
        ).fetchone()
        if existing:
            db.rollback()
            return _balance_payload(Decimal(str(existing[0])), existing[1] or currency, transaction_id)

        wallet = _wallet_row(db, user_id)
        if wallet is None:
            db.rollback()
            return {"status": "ERROR", "error_code": "USER_NOT_FOUND", "balance": 0.0}

        if action == "BET":
            updated = db.execute(
                text(
                    """
                    UPDATE wallets
                    SET balance = balance - :amount,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id
                      AND balance >= :amount
                    RETURNING id, balance, currency
                    """
                ),
                {"amount": str(amount), "user_id": user_id},
            ).fetchone()
            if updated is None:
                current = _wallet_row(db, user_id)
                db.rollback()
                current_balance = float(current[1]) if current else 0.0
                return {
                    "status": "ERROR",
                    "error_code": "INSUFFICIENT_FUNDS",
                    "balance": current_balance,
                }
        else:
            updated = db.execute(
                text(
                    """
                    UPDATE wallets
                    SET balance = balance + :amount,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id
                    RETURNING id, balance, currency
                    """
                ),
                {"amount": str(amount), "user_id": user_id},
            ).fetchone()
            if updated is None:
                db.rollback()
                return {"status": "ERROR", "error_code": "USER_NOT_FOUND", "balance": 0.0}

        wallet_id, new_balance, wallet_currency = updated[0], Decimal(str(updated[1])), updated[2]
        db.execute(
            text(
                """
                INSERT INTO transactions (id, wallet_id, amount, type, reference_id)
                VALUES (:id, :wallet_id, :amount, :tx_type, :reference_id)
                """
            ),
            {
                "id": secrets.token_hex(16),
                "wallet_id": wallet_id,
                "amount": str(amount),
                "tx_type": f"CASINO_{action}",
                "reference_id": transaction_id,
            },
        )
        db.commit()
        return _balance_payload(new_balance, wallet_currency or currency, transaction_id)
    except IntegrityError:
        db.rollback()
        existing = db.execute(
            text(
                """
                SELECT w.balance, w.currency
                FROM transactions AS t
                JOIN wallets AS w ON w.id = t.wallet_id
                WHERE t.reference_id = :reference_id
                """
            ),
            {"reference_id": transaction_id},
        ).fetchone()
        if existing:
            return _balance_payload(Decimal(str(existing[0])), existing[1] or currency, transaction_id)
        return {"status": "ERROR", "error_code": "INTERNAL_ERROR", "message": "Transaction conflict"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        return {"status": "ERROR", "error_code": "INTERNAL_ERROR", "message": str(exc)}


@app.get("/health")
def health_check():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ONLINE", "database": "CONNECTED", "dialect": engine.dialect.name}


@app.post("/api/v1/casino/launch-game")
def launch_game(payload: LaunchGameRequest, db: Session = Depends(get_db)):
    wallet = _wallet_row(db, payload.user_id)
    if wallet is None:
        raise HTTPException(status_code=404, detail="Wallet-ka ciyaartoyga lama helin.")

    token = secrets.token_urlsafe(24)
    DEMO_SESSIONS[token] = {
        "user_id": payload.user_id,
        "game_id": payload.game_id,
        "currency": payload.currency,
    }
    game_url = (
        "http://127.0.0.1:8000/demo/play"
        f"?game={quote(payload.game_id)}&token={quote(token)}"
    )
    return {
        "status": "SUCCESS",
        "game_url": game_url,
        "session_token": token,
        "player_balance": float(wallet[1]),
    }


@app.get("/demo/play")
def demo_play(game: str, token: str):
    session = DEMO_SESSIONS.get(token)
    if session is None or session["game_id"] != game:
        raise HTTPException(status_code=404, detail="Demo session-ka lama helin.")
    return {
        "mode": "demo",
        "game_id": game,
        "user_id": session["user_id"],
        "currency": session["currency"],
    }


@app.post("/api/v1/casino/seamless/webhook")
async def casino_webhook(
    request: Request,
    x_signature: str | None = Header(None, alias="X-Signature"),
    db: Session = Depends(get_db),
):
    body = await request.body()
    if x_signature:
        expected = hmac.new(
            CASINO_HMAC_SECRET.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, x_signature):
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid Signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="JSON-ka khaldan.") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="JSON-ka khaldan.")
    return apply_wallet_event(db, payload)
