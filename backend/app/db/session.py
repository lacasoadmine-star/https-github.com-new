"""Database engine shared by every portal."""

from __future__ import annotations

import os

from sqlalchemy import create_engine, event, text

from app.envfile import load_env_file

load_env_file()
from sqlalchemy.orm import sessionmaker

from app.core.models import Base


def database_url() -> str:
    return os.getenv("DATABASE_URL", "sqlite:///./test_igaming.db")


DB_URL = database_url()
connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}
engine = create_engine(DB_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

if engine.dialect.name == "sqlite":

    @event.listens_for(engine, "connect")
    def _sqlite_connect(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=8000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_user_columns() -> None:
    from sqlalchemy import inspect

    if "users" not in inspect(engine).get_table_names():
        return
    cols = {col["name"] for col in inspect(engine).get_columns("users")}
    with engine.begin() as conn:
        if "status" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL"))
        if "credit_limit" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN credit_limit NUMERIC(18, 4)"))


def init_db() -> None:
    from app.core.seed import seed

    if engine.dialect.name == "postgresql":
        with engine.connect() as conn:
            conn.execute(text("SELECT pg_advisory_lock(847260)"))
            conn.commit()
            try:
                Base.metadata.create_all(engine)
                _ensure_user_columns()
                seed()
            finally:
                conn.execute(text("SELECT pg_advisory_unlock(847260)"))
                conn.commit()
        return
    Base.metadata.create_all(engine)
    _ensure_user_columns()
    seed()
