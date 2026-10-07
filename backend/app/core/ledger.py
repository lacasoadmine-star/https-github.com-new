"""Double-entry wallet movements shared by sports, casino, deposits, and withdrawals."""

from __future__ import annotations

import secrets
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import engine
from app.core.models import MONEY, AuditLog, LedgerEntry, Notification

UNLIMITED_DEBIT = {"clearing"}


class LedgerError(Exception):
    def __init__(self, code: str, status: int = 409) -> None:
        self.code = code
        self.status = status


def money(value: object) -> Decimal:
    return Decimal(str(value)).quantize(MONEY, rounding=ROUND_HALF_UP)


def user_id(db: Session, username: str) -> int:
    row = db.execute(text("SELECT id FROM users WHERE username = :name"), {"name": username}).fetchone()
    if row is None:
        raise LedgerError("ACCOUNT_MISSING", 500)
    return int(row[0])


def balance_of(db: Session, account_user_id: int) -> Decimal:
    row = db.execute(
        text("SELECT balance FROM wallets WHERE user_id = :user_id"),
        {"user_id": account_user_id},
    ).fetchone()
    if row is None:
        raise LedgerError("ACCOUNT_MISSING", 404)
    return money(row[0])


def transfer(
    db: Session,
    debit_user_id: int,
    credit_user_id: int,
    amount: Decimal,
    reason: str,
    reference: str,
    allow_negative_debit: bool = False,
) -> bool:
    """Move funds once. A repeated reference does not move funds again."""
    amount = money(amount)
    if amount <= 0:
        raise LedgerError("INVALID_AMOUNT", 400)
    existing = db.execute(
        text("SELECT id FROM ledger_entries WHERE reference = :reference"),
        {"reference": reference},
    ).fetchone()
    if existing:
        return False

    db.flush()
    db.expire_all()
    if engine.dialect.name == "postgresql":
        for account in sorted({debit_user_id, credit_user_id}):
            db.execute(
                text("SELECT id FROM wallets WHERE user_id = :user_id FOR UPDATE"),
                {"user_id": account},
            )

    if allow_negative_debit:
        debit = db.execute(
            text(
                """
                UPDATE wallets
                SET balance = balance - :amount, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = :user_id
                RETURNING balance
                """
            ),
            {"amount": str(amount), "user_id": debit_user_id},
        ).fetchone()
    else:
        debit = db.execute(
            text(
                """
                UPDATE wallets
                SET balance = balance - :amount, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = :user_id AND balance >= :amount
                RETURNING balance
                """
            ),
            {"amount": str(amount), "user_id": debit_user_id},
        ).fetchone()
    if debit is None:
        raise LedgerError("INSUFFICIENT_FUNDS", 409)

    credit = db.execute(
        text(
            """
            UPDATE wallets
            SET balance = balance + :amount, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = :user_id
            RETURNING balance
            """
        ),
        {"amount": str(amount), "user_id": credit_user_id},
    ).fetchone()
    if credit is None:
        raise LedgerError("ACCOUNT_MISSING", 404)

    db.add(
        LedgerEntry(
            id=secrets.token_hex(16),
            reference=reference,
            reason=reason,
            amount=amount,
            debit_user_id=debit_user_id,
            credit_user_id=credit_user_id,
        )
    )
    db.flush()
    db.expire_all()
    return True


def notify(db: Session, account_user_id: int, kind: str, title: str, body: str) -> dict:
    db.add(Notification(user_id=account_user_id, kind=kind, title=title, body=body, read=False))
    return {"user_id": account_user_id, "kind": kind, "title": title, "body": body}


def audit(db: Session, actor_id: int | None, action: str, detail: str) -> None:
    db.add(AuditLog(actor_id=actor_id, action=action, detail=detail[:300]))


def admin_ids(db: Session) -> list[int]:
    rows = db.execute(text("SELECT id FROM users WHERE role = 'admin'")).fetchall()
    return [int(row[0]) for row in rows]
