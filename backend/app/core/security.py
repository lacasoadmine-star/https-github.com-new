"""JWT role checks. A player token cannot call agent or admin routes."""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import time

import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.envfile import load_env_file
from app.db.session import get_db
from app.core.models import Permission, User

load_env_file()
JWT_SECRET = os.getenv("JWT_SECRET") or "dev-only-superwin-change-me"
TOKEN_TTL_SECONDS = 60 * 60 * 12
ROLE_FOR_PORTAL = {
    "player": "ROLE_PLAYER",
    "agent": "ROLE_AGENT",
    "admin": "ROLE_ADMIN",
}
PORTALS = ("player", "agent", "admin")
TIERS = {
    "player": {"player"},
    "agent": {"master", "super", "agent"},
    "admin": {"superadmin", "financial", "support"},
}
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    salt, _digest = stored.split("$", 1)
    return hmac.compare_digest(hash_password(password, salt), stored)


def role_code_for(user: User) -> str:
    if user.role == "admin" and user.tier == "superadmin":
        return "ROLE_SUPER_ADMIN"
    return ROLE_FOR_PORTAL[user.role]


def issue_token(user: User, portal: str) -> str:
    payload = {
        "sub": str(user.id),
        "role": role_code_for(user),
        "portal": portal,
        "tier": user.tier,
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        ) from exc


def _user_from_payload(db: Session, payload: dict) -> User:
    try:
        user_id = int(payload.get("sub", ""))
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.") from exc
    user = db.get(User, user_id)
    if user is None or user.role not in PORTALS or user.tier not in TIERS[user.role]:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Account-kan waa la xiray.")
    expected = role_code_for(user)
    if payload.get("role") != expected:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")
    return user


def verify_role(required_role: str):
    """Allow the required role, or ROLE_SUPER_ADMIN, and return the user row."""

    def role_checker(
        credentials: HTTPAuthorizationCredentials | None = Security(bearer),
        db: Session = Depends(get_db),
    ) -> User:
        if credentials is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token maqan.")
        payload = _decode(credentials.credentials)
        user_role = payload.get("role")
        if user_role != required_role and user_role != "ROLE_SUPER_ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Requires {required_role} privilege.",
            )
        return _user_from_payload(db, payload)

    return role_checker


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Token maqan.")
    return _user_from_payload(db, _decode(credentials.credentials))


def require_portal(portal: str):
    dependency = verify_role(ROLE_FOR_PORTAL[portal])

    def checker(user: User = Depends(dependency)) -> User:
        if user.role != portal:
            raise HTTPException(status_code=403, detail="Portal-kan laguma oggola.")
        return user

    return checker


def require_permission(action: str):
    def dependency(user: User = Depends(current_user), db: Session = Depends(get_db)) -> User:
        row = (
            db.query(Permission)
            .filter(Permission.role == user.role, Permission.action == action)
            .one_or_none()
        )
        if row is None or not row.allowed:
            raise HTTPException(status_code=403, detail="Ogolaanshahan waa la xiray.")
        return user

    return dependency


def login_portal(db: Session, username: str, password: str, portal: str) -> dict:
    if portal not in PORTALS:
        raise HTTPException(status_code=400, detail="Portal-ka lama aqoonsan.")
    user = db.query(User).filter(User.username == username).one_or_none()
    if user is None or user.role != portal or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Galitaanka waa la diiday.")
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Account-kan waa la xiray.")
    token = issue_token(user, portal)
    return {
        "token": token,
        "role": user.role,
        "role_code": role_code_for(user),
        "tier": user.tier,
        "username": user.username,
        "user_id": user.id,
    }
