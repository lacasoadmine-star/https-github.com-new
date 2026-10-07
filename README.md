# Superwin

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
