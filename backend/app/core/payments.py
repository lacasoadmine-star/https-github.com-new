"""Telebirr receipt checks. The ledger still holds the money; Check.et only confirms a receipt."""

from __future__ import annotations

import os
from decimal import Decimal

import httpx
from fastapi import HTTPException

from app.core.ledger import money
from app.envfile import load_env_file

load_env_file()

DEFAULT_TELEBIRR_ACCOUNT = "0999999138"

PHONE_FIELDS = (
    "receiver_account",
    "receiver_phone",
    "credited_account",
    "account_number",
    "phone",
    "phone_number",
    "msisdn",
    "receiver_msisdn",
)


def checket_key() -> str:
    value = os.getenv("CHECK_ET_API_KEY") or os.getenv("CHECKET_API_KEY") or ""
    if value.strip() in {"", "checket_live_verification_key", "change-me"}:
        return ""
    return value.strip()


def telegram_token() -> str:
    value = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if value.strip() in {"", "8123456789:AAFx_example_token", "change-me"}:
        return ""
    return value.strip()


def telebirr_account() -> str:
    value = os.getenv("TELEBIRR_ACCOUNT", "").strip()
    return value or DEFAULT_TELEBIRR_ACCOUNT


def integration_flags() -> dict:
    return {
        "checket": "CONFIGURED" if checket_key() else "UNSET",
        "telegram": "CONFIGURED" if telegram_token() else "UNSET",
        "telebirr_account": telebirr_account(),
    }


def _digits(value: object) -> str:
    return "".join(ch for ch in str(value) if ch.isdigit())


def _account_matches(receipt: dict, expected: str) -> bool:
    expected_tail = _digits(expected)[-9:]
    if len(expected_tail) < 9:
        return True
    found = []
    for key in PHONE_FIELDS:
        if receipt.get(key):
            found.append(receipt[key])
    if not found:
        return True
    return any(expected_tail in _digits(item) for item in found)


def verify_telebirr(reference: str, amount: Decimal) -> dict:
    key = checket_key()
    if not key:
        raise HTTPException(status_code=503, detail="Check.et lama dejin.")
    account = telebirr_account()
    base = os.getenv("CHECK_ET_BASE_URL", "https://api.check.et").rstrip("/")
    body = {"bank": "telebirr", "transaction_number": reference}
    if account:
        body["account_number"] = account
    try:
        response = httpx.post(
            base + "/api/v1/verify",
            json=body,
            headers={"Authorization": "Bearer " + key},
            timeout=20,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Check.et lama gaari karo.") from exc
    if response.status_code in {401, 403}:
        raise HTTPException(status_code=502, detail="Check.et wuu diiday furaha.")
    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Check.et jawaab khaldan ayuu soo celiyay.") from exc
    if response.status_code >= 400 or not payload.get("success") or not payload.get("exists", True):
        raise HTTPException(status_code=409, detail="Transaction-ka lama xaqiijin.")
    if payload.get("duplicate"):
        raise HTTPException(status_code=409, detail="Transaction-kaan hore ayaa loo isticmaalay.")
    receipt = (payload.get("data") or {}).get("receipt") or {}
    status = str(receipt.get("status") or "completed").lower()
    if status not in {"completed", "success", "paid", "successful"}:
        raise HTTPException(status_code=409, detail="Transaction-ka lama xaqiijin.")
    if "amount" not in receipt:
        raise HTTPException(status_code=409, detail="Xaddiga lama helin.")
    verified = money(receipt["amount"])
    if verified != money(amount):
        raise HTTPException(status_code=409, detail="Xaddiga lama isla eego.")
    if account and not _account_matches(receipt, account):
        raise HTTPException(status_code=409, detail="Lacagtu account-ka Telebirr lama soo dhigin.")
    currency = str(receipt.get("currency") or "ETB")
    if currency.upper() not in {"ETB", "BIRR"}:
        raise HTTPException(status_code=409, detail="Lacagta ma aha ETB.")
    return {
        "amount": verified,
        "currency": "ETB",
        "payer": receipt.get("payer_name") or "",
        "reference": reference,
    }


def _chat_id(token: str) -> str:
    configured = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    if configured:
        return configured
    try:
        response = httpx.get(
            f"https://api.telegram.org/bot{token}/getUpdates",
            timeout=10,
        )
        rows = response.json().get("result") or []
    except (httpx.HTTPError, ValueError):
        return ""
    for item in reversed(rows):
        chat = (item.get("message") or item.get("channel_post") or {}).get("chat") or {}
        if chat.get("id") is not None:
            return str(chat["id"])
    return ""


def notify_telegram(text: str) -> None:
    token = telegram_token()
    if not token:
        return
    chat_id = _chat_id(token)
    if not chat_id:
        return
    try:
        httpx.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text},
            timeout=10,
        )
    except httpx.HTTPError:
        return
