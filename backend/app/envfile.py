"""Load the repo .env before JWT_SECRET and payment flags are read."""

from __future__ import annotations

import os
from pathlib import Path

_PLACEHOLDER_ENV = {
    "",
    "change-me",
    "checket_live_verification_key",
    "8123456789:AAFx_example_token",
    "dev-only-superwin-change-me",
    "superwin_jwt_secret_key_prod_2026",
}


def load_env_file() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.is_file():
        return
    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        current = os.environ.get(key, "")
        if key not in os.environ or current.strip() in _PLACEHOLDER_ENV:
            os.environ[key] = value
