"""Agent routes. A player or admin token cannot open this ledger."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.emit import emit
from app.api.v1.schemas import AccountIn, CreditIn, ProfileIn
from app.core.models import User
from app.core.security import require_permission, require_portal
from app.db.session import get_db
from app.core import services

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.get("/dashboard")
def agent_dashboard(user: User = Depends(require_portal("agent")), db: Session = Depends(get_db)):
    return services.dashboard_for(db, user)


@router.get("/players")
def agent_players(user: User = Depends(require_portal("agent")), db: Session = Depends(get_db)):
    ids = set(services.player_ids(db, user.id))
    return {"items": [row for row in services.users_by_role(db, "player") if row["id"] in ids]}


@router.post("/players")
async def agent_create_player(payload: AccountIn, user: User = Depends(require_permission("agent.players.create"))):
    if user.role != "agent":
        raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
    return await emit(services.create_account(user.id, payload.username, payload.email, payload.password, "player", user.id, None))


@router.get("/balance")
def agent_balance(user: User = Depends(require_portal("agent")), db: Session = Depends(get_db)):
    return services.wallet_view(db, user)


@router.get("/deposits")
def agent_deposits(user: User = Depends(require_portal("agent")), db: Session = Depends(get_db)):
    return {"items": services._deposits(db, agent_id=user.id)}


@router.get("/withdrawals")
def agent_withdrawals(user: User = Depends(require_portal("agent")), db: Session = Depends(get_db)):
    return {"items": services._withdrawals(db, agent_id=user.id)}


@router.get("/transactions")
def agent_transactions(user: User = Depends(require_portal("agent")), db: Session = Depends(get_db)):
    ids = services.player_ids(db, user.id) + [user.id]
    return {"items": services.ledger_rows(db, ids)}


@router.get("/commissions")
def agent_commissions(user: User = Depends(require_portal("agent")), db: Session = Depends(get_db)):
    return {"items": services.commission_rows(db, user.id)}


@router.get("/sub-agents")
def agent_subs(user: User = Depends(require_portal("agent")), db: Session = Depends(get_db)):
    return {"items": services.sub_agents(db, user.id)}


@router.post("/sub-agents")
async def agent_create_sub(payload: AccountIn, user: User = Depends(require_permission("agent.subagents"))):
    if user.role != "agent" or user.tier not in {"master", "super"}:
        raise HTTPException(status_code=403, detail="Access Denied: Requires master or super desk.")
    return await emit(
        services.create_account(user.id, payload.username, payload.email, payload.password, "agent", None, user.id)
    )


@router.get("/hierarchy")
def agent_hierarchy(user: User = Depends(require_portal("agent")), db: Session = Depends(get_db)):
    if user.tier not in {"master", "super"}:
        raise HTTPException(status_code=403, detail="Access Denied: Requires master or super desk.")
    return services.agent_hierarchy(db, user.id)


@router.post("/credit")
def agent_credit(payload: CreditIn, user: User = Depends(require_portal("agent"))):
    if user.tier not in {"master", "super"}:
        raise HTTPException(status_code=403, detail="Access Denied: Requires master or super desk.")
    return services.set_credit_limit(user.id, payload.username, payload.credit_limit)["body"]


@router.get("/reports")
def agent_reports(user: User = Depends(require_portal("agent")), db: Session = Depends(get_db)):
    return services.agent_report(db, user)


@router.get("/notifications")
def agent_notes(user: User = Depends(require_portal("agent")), db: Session = Depends(get_db)):
    return services.notifications_for(db, user)


@router.get("/profile")
def agent_profile(user: User = Depends(require_portal("agent"))):
    return {"username": user.username, "email": user.email, "role": user.role, "tier": user.tier}


@router.post("/profile")
def agent_profile_update(payload: ProfileIn, user: User = Depends(require_permission("agent.profile"))):
    if user.role != "agent":
        raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
    return services.update_profile(user.id, payload.email)["body"]
