"""Run the existing wallet/game engine on loopback with a disposable database."""
import argparse
import os
from pathlib import Path
import secrets
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--demo", action="store_true", required=True,
                        help="Explicitly create test accounts and fictional credits")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    # Ignore both inherited production configuration and the repository .env.
    with tempfile.TemporaryDirectory(prefix="superwin-local-demo-") as directory:
        os.environ.update({
            "SUPERWIN_SKIP_ENV_FILE": "1",
            "DATABASE_URL": "sqlite:///" + str(Path(directory) / "demo.db"),
            "JWT_SECRET": secrets.token_hex(32),
            "CASINO_HMAC_SECRET": secrets.token_hex(32),
            "REDIS_URL": "", "CHECK_ET_API_KEY": "", "CHECKET_API_KEY": "",
            "TELEGRAM_BOT_TOKEN": "", "TELEGRAM_CHAT_ID": "",
            "TELEBIRR_ACCOUNT": "",
        })
        sys.path.insert(0, str(ROOT / "backend"))
        import uvicorn
        from fastapi.responses import FileResponse, JSONResponse
        import app.main as platform
        from app.core.ledger import transfer, user_id
        from app.core.models import Wallet
        from app.db.session import SessionLocal, engine
        from decimal import Decimal

        platform.APPS = ROOT / "apps"
        with SessionLocal.begin() as db:
            for wallet in db.query(Wallet).all():
                wallet.currency = "ETB"
            transfer(db, user_id(db, "house"), user_id(db, "player"),
                     Decimal("1000"), "local_demo_credit", "local-demo-opening")

        @platform.app.middleware("http")
        async def local_boundary(request, call_next):
            # This standalone launcher only exposes read views, login, and game play.
            if request.method not in {"GET", "HEAD"} and request.url.path not in {
                "/api/auth/login", "/api/player/casino/play",
            }:
                return JSONResponse({"detail": "Local demo only; payments are disabled."}, status_code=403)
            response = await call_next(request)
            response.headers["Cache-Control"] = "no-store"
            return response

        @platform.app.get("/local")
        def local_page():
            return FileResponse(ROOT / "scripts" / "local-demo.html")

        print(f"Local demo: http://127.0.0.1:{args.port}/local", flush=True)
        print("Fictional 1,000 ETB. Payments disabled. Data is removed on exit.", flush=True)
        try:
            uvicorn.run(platform.app, host="127.0.0.1", port=args.port)
        finally:
            engine.dispose()


if __name__ == "__main__":
    main()
