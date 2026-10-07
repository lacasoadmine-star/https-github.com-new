"""Player routes. Bound to the player role only."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.emit import emit
from app.api.v1.schemas import AmountIn, BetIn, PlayIn, ProfileIn
from app.core.models import Notification, User
from app.core.security import require_permission, require_portal
from app.db.session import get_db
from app.core import payments, services

router = APIRouter(prefix="/api/player", tags=["player"])


@router.get("/dashboard")
def player_dashboard(user: User = Depends(require_portal("player")), db: Session = Depends(get_db)):
    return services.dashboard_for(db, user)


@router.post("/deposit")
async def player_deposit(payload: AmountIn, user: User = Depends(require_permission("player.deposit"))):
    if user.role != "player":
        raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
    result = services.deposit(user.id, payload.amount, payload.client_reference, payload.channel)
    note = result["body"].pop("telegram", None)
    if note:
        payments.notify_telegram(note)
    return await emit(result)


@router.post("/withdraw")
async def player_withdraw(payload: AmountIn, user: User = Depends(require_permission("player.withdraw"))):
    if user.role != "player":
        raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
    return await emit(services.request_withdrawal(user.id, payload.amount, payload.client_reference))


@router.get("/wallet")
def player_wallet(user: User = Depends(require_portal("player")), db: Session = Depends(get_db)):
    return services.wallet_view(db, user)


@router.get("/history")
def player_history(user: User = Depends(require_portal("player")), db: Session = Depends(get_db)):
    return services.history_for(db, user)


@router.get("/notifications")
def player_notes(user: User = Depends(require_portal("player")), db: Session = Depends(get_db)):
    return services.notifications_for(db, user)


@router.post("/notifications/read")
def player_notes_read(user: User = Depends(require_portal("player")), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == user.id).update({Notification.read: True})
    db.commit()
    return {"status": "OK"}


@router.get("/profile")
def player_profile(user: User = Depends(require_portal("player"))):
    return {"username": user.username, "email": user.email, "role": user.role, "tier": user.tier}


@router.post("/profile")
def player_profile_update(payload: ProfileIn, user: User = Depends(require_permission("player.profile"))):
    if user.role != "player":
        raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
    return services.update_profile(user.id, payload.email)["body"]


@router.get("/sports")
def player_sports(
    live: bool = Query(False),
    user: User = Depends(require_portal("player")),
    db: Session = Depends(get_db),
):
    return services.list_events(db, live)


@router.post("/sports/bets")
async def player_bet(payload: BetIn, user: User = Depends(require_permission("player.sports"))):
    if user.role != "player":
        raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
    return await emit(services.place_sports_bet(user.id, payload.event_id, payload.selection, payload.stake))


@router.get("/bets")
def player_bets(user: User = Depends(require_portal("player")), db: Session = Depends(get_db)):
    return services.list_bets(db, user)


@router.get("/casino")
def player_casino(user: User = Depends(require_portal("player")), db: Session = Depends(get_db)):
    return services.casino_games(db)


@router.post("/casino/play")
async def player_play(payload: PlayIn, user: User = Depends(require_permission("player.casino"))):
    if user.role != "player":
        raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
    return await emit(services.play_casino(user.id, payload.game_code, payload.stake))
