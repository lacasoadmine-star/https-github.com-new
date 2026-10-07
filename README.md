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

The script builds the workspaces, runs the SQLite tests, recreates the local `igaming` database, and checks the three portals against PostgreSQL. Sports and casino stay on this machine. The domains above are not deployed from a feature branch.
