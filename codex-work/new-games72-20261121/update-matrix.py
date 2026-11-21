#!/usr/bin/env python3
"""Render the durable work matrix from real registry and filesystem state.

This does not create games, change registry state, or promote release readiness.
"""
import hashlib
import json
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
registry_bytes = (HERE / "registry.json").read_bytes()
registry = json.loads(registry_bytes)
baseline = json.loads((HERE / "preservation/baseline.json").read_text())
games = registry["games"]
assert len(games) == registry["targetNewGames"] == 72
assert len({game["gameId"] for game in games}) == 72


def safe(value):
    return str(value).replace("|", "\\|").replace("\n", " ")


def ref(path):
    return f"[{safe(path)}]({path})" if (REPO / path).exists() else f"`{safe(path)}` — RESERVED, absent"


def code(value):
    return f"`{safe(value)}`"


states = Counter(game["status"] for game in games)
rounds = sum(game["reference"].get("manualRoundsObserved", 0) for game in games)
seven = sum(game["reference"].get("manualRoundsObserved", 0) >= 7 for game in games)
ready = sum(game["status"] in {"RELEASE_READY", "LIVE_VERIFIED", "COMPLETED"} for game in games)
live = sum(game["status"] in {"LIVE_VERIFIED", "COMPLETED"} for game in games)
lines = [
    "# ZPLAY / Superwin — 72 additional games matrix",
    "",
    "This is the active additive scope requested on 21 November 2026 (Africa/Addis_Ababa). It preserves the prior game catalog and unfinished prior work. It does not count an old game or a reserved path as a new playable implementation.",
    "",
    f"Registry: [{registry['releaseId']}]({HERE.relative_to(REPO)}/registry.json). Registry SHA-256: `{hashlib.sha256(registry_bytes).hexdigest()}`.",
    "",
    "## Current totals",
    "",
    "| Measure | Verified count / state |",
    "|---|---|",
    f"| New identities in this scope | {len(games)} |",
    f"| Names supplied by user / additional fresh official names | {registry['explicitUserNames']} / {registry['freshOfficialAdditionalNames']} |",
    f"| Retained legacy source-catalog entries | {baseline['legacyCatalogCount']} — source inventory, not 74 verified live games |",
    f"| Games with seven separate manual reference rounds | {seven} |",
    f"| Counted manual reference rounds | {rounds}; AUTO/STOP extra rounds tracked separately in the game records |",
    f"| New games RELEASE_READY or later | {ready} |",
    f"| New games LIVE_VERIFIED or COMPLETED | {live} |",
    f"| Public activation | {str(registry['publicActivation']).lower()} |",
    "",
    "Current work states: " + "; ".join(f"`{state}` = {count}" for state, count in sorted(states.items())) + ".",
    "",
    "## Identity rules and preservation",
    "",
    "The fresh official catalog supplied 75 distinct product/launcher identities. Multi Hot 5, Foxy Hot 20 and Habesha Fortune 5 are protected and excluded from the new set. The first 57 entries follow the user's supplied names; entries 58–72 complete the requested set using current official catalog products. A same-name old module keeps its old internal identity and route. The new implementation must still be authored and tested independently from current per-game evidence.",
    "",
    "AviaStar / JetX3, Crash Duel / TugOfWar, Double X / SlicerX and 4 Bonuses Bonanza / PlinkoJoker are single product/launcher mappings, not additional games. The JetX launcher of New Era of JetX is counted once. The source register records variant and marketing-copy conflicts; those conflicts are not silently converted into payout rules.",
    "",
    f"Preservation baseline: [{baseline['sourceCommit']}]({HERE.relative_to(REPO)}/preservation/baseline.json). All existing game source/assets/routes and prior progress history are retained. Existing database, wallet, ledger, accounts, sessions, permissions, Agent/Admin and Telebirr have not been migrated or reset by this preparation.",
    "",
    "## State semantics",
    "",
    "Prerequisites use `REFERENCE_PENDING`, `REFERENCE_PARTIAL` or `REFERENCE_BLOCKED`. A product page or title-screen entry alone is not `REFERENCE_CAPTURED`. The required advancement is:",
    "",
    "`REFERENCE_CAPTURED → RULES_VERIFIED → IMPLEMENTING → TESTING → FIXED_PENDING_RETEST → RELEASE_READY → LIVE_VERIFIED → COMPLETED`",
    "",
    "`FIXED_PENDING_RETEST` applies while an actual fix awaits its failed-action retest; it is not required when no defect occurred. A game can have verified code for a small subset while its overall reference state remains partial. Missing observations of a rare feature do not prove that feature absent. Confirmed rules drive controlled fixtures; unverified financial rules remain blocked.",
    "",
    "## Work ownership and concurrency",
    "",
    "Every game below has eight persistent task owners: reference, rules, assets, frontend, backend, controls, sound/animation and QA. These task names survive agent/session changes. Cohorts of ten are reporting groups, not sequential gates. Independent tasks may run concurrently within the four-worker limit. A blocked game does not cancel any other game's task.",
    "",
    "| Coordination area | Responsible task | Boundary |",
    "|---|---|---|",
    "| Registry, matrix, integration and publication | `release-coordinator` | Owns shared registry and root progress; rechecks current remote head before publication |",
    "| Authentication, ETB and network recovery | `shared-recovery` | Existing API/ledger only; no new wallet or hidden guessed refund |",
    "| Per-game source and evidence | Per-game tasks listed below | Write only assigned game paths; evidence is never runtime gameplay |",
    "| Cross-review and release gate | `architecture-audit` | Retest defects; all 72 required before activation |",
    "",
    "## Exact identity mapping",
    "",
    "Routes below are reserved new routes. They are not served live merely because they appear in this table. Backend configurations are disabled for every game at this checkpoint.",
    "",
    "| # | Exact official name | Reference provider / launcher variant | New stable gameId | Frontend route | Current official source |",
    "|---:|---|---|---|---|---|",
]
for game in games:
    lines.append(f"| {game['ordinal']} | {safe(game['officialName'])} | {safe(game['provider'])} / {code(game['variant']['key'])} | {code(game['gameId'])} | {code(game['route'])} | [Official page]({game['reference']['officialPage']}) |")

lines += ["", "## Per-game files, evidence, status and next action", "",
          "An absent path is explicitly marked RESERVED. A directory containing only evidence is not a gameplay module. Version hashes are in each real evidence/test report; release versions remain unset until verified.", ""]
for game in games:
    n, title = game["ordinal"], game["officialName"]
    lines += [f"### {n:02d}. {title}", "",
        f"**Identity:** {code(game['gameId'])}; {safe(game['provider'])}; launcher {code(game['variant']['key'])}; cohort {game['cohort']}.", "",
        "| Item | Current record |", "|---|---|",
        f"| Frontend route | {code(game['route'])}; {game['deploymentStatus']} |",
        f"| Module | {ref(game['modulePath'])}; {game['pathStatus']} |",
        f"| Backend configuration | {ref(game['backend']['configurationPath'])}; enabled={str(game['backend']['enabled']).lower()} |",
        f"| Payout evaluator | {ref(game['backend']['evaluatorPath'])} |",
        f"| Assets | {ref(game['assets']['manifestPath'])}; runtime prefix {code(game['assets']['prefix'])}; rights={game['assets']['rightsStatus']} |",
        f"| Official references | [Product]({game['reference']['officialPage']}); [public demo]({game['reference']['officialDemo']}) |",
        f"| Captured evidence | {ref(game['evidence']['referenceManifestPath'])}; manual rounds={game['reference'].get('manualRoundsObserved', 0)}; video={str(game['reference'].get('videoCaptured',False)).lower()}; audible sound verified={str(game['reference'].get('audibleSoundVerified',False)).lower()} |",
        f"| Rules | {ref(game['evidence']['rulesSpecPath'])}; release rules version={code(game['backend']['rulesVersion'])}; release engine version={code(game['backend']['engineVersion'])} |",
        f"| Overall / reference | {code(game['status'])} / {code(game['referenceStatus'])} |",
        f"| Build / tests / deployment | {code(game['buildStatus'])} / {code(game['testStatus'])} / {code(game['deploymentStatus'])} |",
        f"| Open issues | {', '.join(code(issue) for issue in game['openDefects']) or 'No individual defect registered; incomplete release prerequisites still apply.'} |",
    ]
    if game["reference"].get("accessSurveyPath"):
        lines.append(f"| Entry/access survey | {ref(game['reference']['accessSurveyPath'])}; entry-only evidence does not count a round |")
    if game["reference"].get("followUpEvidencePath"):
        lines.append(f"| Later access observation | {ref(game['reference']['followUpEvidencePath'])}; {code(game['reference']['followUpStatus'])}; {code(game['reference']['followUpObservedAt'])}; earlier entry observation retained |")
    lines += ["", "**Task owners:** " + "; ".join(f"{key} = {code(value)}" for key, value in game["owners"].items()) + ".",
              "", f"**Next action:** {game['nextAction']}", ""]

lines += [
    "## Defects, retests and evidence limitations",
    "",
    f"- [Source conflicts 01–30]({HERE.relative_to(REPO)}/references/source-conflicts-01-30.json) and [58–72]({HERE.relative_to(REPO)}/references/source-conflicts-58-72.json) retain unresolved official-page inconsistencies and missing full specifications.",
    f"- [Peer review and retests]({HERE.relative_to(REPO)}/release/peer-review.json) record reproduced capture/recovery/lifecycle defects, changed files, exact retests and limits.",
    f"- [Roll X specification]({HERE.relative_to(REPO)}/games/roll-x/specification.json) separates observed arithmetic, original implementation, unverified probability/rounding/target rules and the required existing-server target binding.",
    f"- [Multi Hot 5 Deluxe specification]({HERE.relative_to(REPO)}/games/multi-hot-5-deluxe/specification.json) resolves bound base-paytable scaling for deterministic five-line arithmetic; full outcome legality, maximum-win behavior, probability model and remaining controls stay unverified. Supplemental desktop result images add zero canonical rounds.",
    f"- [Multi Hot 5 Wild follow-up restriction]({HERE.relative_to(REPO)}/references/access-survey/multi-hot-5-wild-followup-blocker.json) records a country block after the separate earlier entry-only sound prompt. Both observations remain preserved; zero gameplay rounds were counted.",
    f"- [Retained-asset regression review]({HERE.relative_to(REPO)}/integration/asset-router-review.json) records three reproduced failures and verified fixes. Exact retained historical asset URLs remain available independently of a closed or invalid current publication; there is no old-release substitution.",
    f"- [Hot Samba restriction]({HERE.relative_to(REPO)}/games/hot-samba/evidence/2026-11-21/observation.json) is an observed provider country block. Zero rounds were counted and no region/proxy bypass was attempted.",
    f"- [Actual registry validation]({HERE.relative_to(REPO)}/release/actual-registry-validation.json) and [release review]({HERE.relative_to(REPO)}/release/actual-release-review.json) are separate: valid identities do not mean release permission.",
    "",
    "Every test report identifies its environment and source hashes. Synthetic fixtures do not verify actual ETB settlement, independent RNG, provider audio parity or live deployment. Demo credit, tokens and session data remain separate from operator accounts. Only public DEMO launch links and redacted observations belong in this repository.",
    "",
    "## One-release activation and rollback",
    "",
    "All 72 games must reach RELEASE_READY with verified rules, individual code/controls/animation/sound, isolated wallet/recovery tests, mobile/lifecycle tests and lawful runtime assets. The source commit, frontend/backend/rules versions, asset hashes and evidence are pinned in the release manifest. Before activation, recapture the current live service/module/configuration baseline and preserve intervening work. Platform SUCCESS or a Git push is not live verification.",
    "",
    "Rollback can disable only new-game future rounds. It must preserve accepted-round lookup/settlement, historical rules/assets, ledger rows, prior payouts and correct balances. It cannot restore an older balance snapshot or delete transactions. Existing game traffic stays on its original paths.",
    "",
    f"Continue from [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md), this matrix, the current registry and the per-game evidence/task records. Regenerate this file with `python {HERE.relative_to(REPO)}/update-matrix.py`; do not rerun the one-time registry importer over existing work.",
    "",
]
(REPO / "NEW_GAMES_72_MATRIX.md").write_text("\n".join(lines), encoding="utf-8")
print(json.dumps({"file": "NEW_GAMES_72_MATRIX.md", "newGames": 72, "manualReferenceRounds": rounds,
                  "sevenRoundGames": seven, "releaseReady": ready, "liveVerified": live}))
