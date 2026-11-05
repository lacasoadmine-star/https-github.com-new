# Superwin

## Local wallet demo (no provider API)

Run the existing local game engine and shared wallet with fictional credits:

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
npm ci
npm run build
.venv/bin/python scripts/local_demo.py --demo
```

Open http://127.0.0.1:8000/local and click **Bilow tijaabada**. On Windows use
`.venv\Scripts\python` and `.venv\Scripts\pip` instead. This runs on the machine
where the command is executed; it does not update the Cloudflare website.

The explicit `--demo` flag creates test accounts and 1,000 fictional ETB for the
player in a new temporary SQLite database. It ignores the repository `.env` and
inherited database credentials, listens only on loopback, disables payments and
other write operations, and removes the demo database when stopped. Restarting
creates a fresh demo. No existing balances are changed.

Flicker pays 2× the stake with 50% probability, otherwise zero. Steady always pays
2× for testing. Both use the existing server-side ledger, balance checks, round
history and transactions. These are test games, not a production casino or a
conversion of SmartSoft/Pragmatic demos. Do not expose this launcher publicly.

Three separate sites share one FastAPI backend, one PostgreSQL database, and one wallet ledger.

| App | Local path | Intended host |
| --- | --- | --- |
| Player | `/player` | `superwin.bet` |
| Agent | `/agent` | `superwinagentsystem.admindigi.com` |
| Admin | `/admin` | `superwinadmin.admindigi.com` |

Demo accounts: `player` / `play123`, `agent` / `agent123`, `admin` / `admin123`.

```bash
bash setup_and_run.sh


```

The script writes a local `.env` that is not committed, builds the workspaces, runs the SQLite tests, recreates the local `igaming` database, starts the API under PM2, and checks Nginx plus the three portals against PostgreSQL. Sports, casino launch, and the signed webhook stay on this machine. The domains above are not deployed from a feature branch.
