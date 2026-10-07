"""Local casino session launch and signed wallet webhook."""

from __future__ import annotations

import hashlib
import hmac
import json
import os

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.v1.emit import emit
from app.api.v1.schemas import LaunchIn
from app.core.models import User
from app.core.security import require_permission
from app.core import services

router = APIRouter(prefix="/api/v1/casino", tags=["casino"])


def sign_body(raw: bytes) -> str:
    secret = os.getenv("CASINO_HMAC_SECRET", "dev-only-casino-hmac").encode()
    return hmac.new(secret, raw, hashlib.sha256).hexdigest()


@router.post("/launch-game")
def launch_game(payload: LaunchIn, user: User = Depends(require_permission("player.casino"))):
    if user.role != "player":
        raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
    return services.launch_game(user.id, payload.game_code)["body"]


@router.post("/seamless/webhook")
async def seamless_webhook(request: Request):
    raw = await request.body()
    provided = request.headers.get("x-signature", "")
    if not provided or not hmac.compare_digest(provided.lower(), sign_body(raw)):
        raise HTTPException(status_code=401, detail="Invalid signature.")
    try:
        payload = json.loads(raw)
        session_id = str(payload["session_id"])
        transaction_id = str(payload["transaction_id"])
        action = str(payload["action"])
        amount = payload["amount"]
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Webhook body-ga waa khaldan yahay.") from exc
    if not session_id or not transaction_id:
        raise HTTPException(status_code=400, detail="Webhook body-ga waa khaldan yahay.")
    return await emit(services.apply_casino_webhook(session_id, transaction_id, action, amount))
