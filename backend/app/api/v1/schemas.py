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
    channel: str | None = None


class AccountIn(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str
    password: str = Field(min_length=6, max_length=80)


class ProfileIn(BaseModel):
    email: str


class LaunchIn(BaseModel):
    game_code: str = Field(min_length=1, max_length=40)


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


class CreditIn(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    credit_limit: Decimal = Field(ge=0, le=100000000)


class StatusIn(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    status: str


class ProviderIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    kind: str
