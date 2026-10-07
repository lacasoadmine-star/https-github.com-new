"""Request bodies shared by the three portals."""

from decimal import Decimal

from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    username: str
    password: str
    portal: str


class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str
    password: str = Field(min_length=6, max_length=80)


class AmountIn(BaseModel):
    amount: Decimal = Field(gt=0, le=1000000)
    client_reference: str | None = None


class AccountIn(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str
    password: str = Field(min_length=6, max_length=80)


class ProfileIn(BaseModel):
    email: str


class BetIn(BaseModel):
    event_id: int
    selection: str
    stake: Decimal = Field(gt=0, le=1000000)


class SettleIn(BaseModel):
    result: str


class PlayIn(BaseModel):
    game_code: str
    stake: Decimal = Field(gt=0, le=1000000)


class SettingIn(BaseModel):
    key: str
    value: str


class PermissionIn(BaseModel):
    role: str
    action: str
    allowed: bool


class ProviderIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    kind: str
