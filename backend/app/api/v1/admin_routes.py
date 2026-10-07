"""Admin routes. Player and agent tokens are rejected."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.emit import emit
from app.api.v1.schemas import AccountIn, PermissionIn, ProviderIn, SettingIn, SettleIn
from app.core.models import User
from app.core.security import require_permission, require_portal
from app.db.session import get_db
from app.core import services

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard")
def admin_dashboard(user: User = Depends(require_portal("admin")), db: Session = Depends(get_db)):
    return services.dashboard_for(db, user)


@router.get("/players")
def admin_players(user: User = Depends(require_portal("admin")), db: Session = Depends(get_db)):
    return {"items": services.users_by_role(db, "player")}


@router.get("/agents")
def admin_agents(user: User = Depends(require_portal("admin")), db: Session = Depends(get_db)):
    return {"items": services.users_by_role(db, "agent")}


@router.post("/agents")
async def admin_create_agent(payload: AccountIn, user: User = Depends(require_permission("admin.agents"))):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
    return await emit(services.create_account(user.id, payload.username, payload.email, payload.password, "agent", None, None))


@router.get("/transactions")
def admin_transactions(user: User = Depends(require_portal("admin")), db: Session = Depends(get_db)):
    return {"items": services.ledger_rows(db)}


@router.get("/deposits")
def admin_deposits(user: User = Depends(require_portal("admin")), db: Session = Depends(get_db)):
    return {"items": services._deposits(db)}


@router.get("/withdrawals")
def admin_withdrawals(user: User = Depends(require_portal("admin")), db: Session = Depends(get_db)):
    return {"items": services._withdrawals(db)}


@router.post("/withdrawals/{withdrawal_id}/approve")
async def admin_approve(withdrawal_id: int, user: User = Depends(require_permission("admin.withdrawals"))):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
    return await emit(services.decide_withdrawal(user.id, withdrawal_id, True))


@router.post("/withdrawals/{withdrawal_id}/reject")
async def admin_reject(withdrawal_id: int, user: User = Depends(require_permission("admin.withdrawals"))):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
    return await emit(services.decide_withdrawal(user.id, withdrawal_id, False))


@router.get("/sports")
def admin_sports(user: User = Depends(require_portal("admin")), db: Session = Depends(get_db)):
    return services.all_events(db)


@router.post("/sports/{event_id}/settle")
async def admin_settle(event_id: int, payload: SettleIn, user: User = Depends(require_permission("admin.sports"))):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
    return await emit(services.settle_event(user.id, event_id, payload.result))


@router.get("/casino")
def admin_casino(user: User = Depends(require_portal("admin")), db: Session = Depends(get_db)):
    return services.casino_games(db)


@router.get("/providers")
def admin_providers(user: User = Depends(require_portal("admin")), db: Session = Depends(get_db)):
    return {"items": services.provider_rows(db)}


@router.post("/providers")
def admin_add_provider(payload: ProviderIn, user: User = Depends(require_permission("admin.providers"))):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
    return services.add_provider(user.id, payload.name, payload.kind)["body"]


@router.get("/commissions")
def admin_commissions(user: User = Depends(require_portal("admin")), db: Session = Depends(get_db)):
    return {"items": services.commission_rows(db)}


@router.get("/reports")
def admin_reports(user: User = Depends(require_portal("admin")), db: Session = Depends(get_db)):
    return services.admin_report(db)


@router.get("/audit-logs")
def admin_audit(user: User = Depends(require_portal("admin")), db: Session = Depends(get_db)):
    return {"items": services.audit_rows(db)}


@router.get("/settings")
def admin_settings(user: User = Depends(require_portal("admin")), db: Session = Depends(get_db)):
    return services.settings_view(db)


@router.post("/settings")
def admin_settings_update(payload: SettingIn, user: User = Depends(require_permission("admin.settings"))):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
    return services.update_setting(user.id, payload.key, payload.value)["body"]


@router.get("/permissions")
def admin_permissions(user: User = Depends(require_portal("admin")), db: Session = Depends(get_db)):
    return {"items": services.permission_rows(db)}


@router.post("/permissions")
def admin_permissions_update(payload: PermissionIn, user: User = Depends(require_permission("admin.permissions"))):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
    return services.update_permission(user.id, payload.role, payload.action, payload.allowed)["body"]


@router.get("/conservation")
def admin_conservation(user: User = Depends(require_portal("admin")), db: Session = Depends(get_db)):
    return {"total": services.conservation(db)}
