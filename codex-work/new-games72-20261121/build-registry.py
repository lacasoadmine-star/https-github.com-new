"""Rebuild the additive identity ledger from this request's fresh observations.

This writes work metadata, never engines, payouts, balances, or deploy commands.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
RESEARCH = ROOT / 'references'
REL = ROOT.relative_to(REPO).as_posix()
BASE = '1d0f4c9ddc9d14aacc436021ed0bcb2b27dd85f0'

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

if (ROOT / 'registry.json').exists():
    raise SystemExit('Registry already exists. Preserve recorded work; update rows explicitly instead of regenerating.')
seed = json.loads((RESEARCH / 'identity-seed.json').read_text())
assert len(seed['games']) == 72
legacy_path = REPO / 'codex-work/native72-20261119/qa/game-progress.json'
legacy = json.loads(legacy_path.read_text())
legacy_games = []
for row in legacy['games']:
    legacy_games.append({
        'catalogId': row['catalogId'], 'name': row['title'],
        'gameId': row['progress'].get('backendGameId') or row['catalogId'],
        'routes': sorted(set(x for x in row['routes'].values() if x)),
        'sourceKey': row['sourceKey'],
    })
for row in legacy['scope']['protectedGames']:
    legacy_games.append({'catalogId': row['catalogId'], 'name': row['title'],
                         'gameId': row['route'].rsplit('/', 1)[-1],
                         'routes': [row['route']], 'sourceKey': row['sourceKey']})
baseline = {
    'schema': 'zplay/new-games72-preservation-baseline/v1',
    'sourceCommit': BASE,
    'sourceTree': subprocess.check_output(['git', 'rev-parse', BASE + '^{tree}'], cwd=REPO, text=True).strip(),
    'inventorySource': legacy_path.relative_to(REPO).as_posix(),
    'inventorySha256': digest(legacy_path),
    'legacyCatalogCount': len(legacy_games),
    'inventoryScope': 'Retained source catalog; not a fresh full production availability audit.',
    'preserveEntireExistingWorker': True,
    'gameIds': sorted(set(g['gameId'] for g in legacy_games)),
    'catalogIds': sorted(set(g['catalogId'] for g in legacy_games)),
    'routes': sorted(set(r for g in legacy_games for r in g['routes'])),
    'assetPrefixes': ['/new74/', '/independent74/', '/zplay-native-', '/zplay-player-'],
    'games': legacy_games,
    'activationRequiresFreshLiveBaseline': True,
}
write_json(ROOT / 'preservation/baseline.json', baseline)

games = []
for row in seed['games']:
    slug = re.sub(r'[^a-z0-9]+', '-', row['officialName'].lower()).strip('-')
    module = f'{REL}/games/{slug}'
    game_id = 'zplay72_' + slug.replace('-', '_') + '_v1'
    cohort = f"{((row['number'] - 1) // 10) * 10 + 1:02d}-{min(((row['number'] - 1) // 10 + 1) * 10, 72):02d}"
    games.append({
        'ordinal': row['number'], 'gameId': game_id, 'officialName': row['officialName'],
        'provider': row['provider'], 'variant': {'key': row['demoGameName'], 'category': row['demoGameCategory'] or ''},
        'category': row['category'], 'scopeSource': row['scopeSource'], 'cohort': cohort,
        'route': f'/new-games72/{slug}/', 'modulePath': module,
        'backend': {'configurationPath': module + '/specification.json', 'evaluatorPath': module + '/evaluator.mjs',
                    'enabled': False, 'rulesVersion': None, 'engineVersion': None},
        'assets': {'prefix': f'/new-games72/{slug}/assets/v1/', 'manifestPath': module + '/assets-manifest.json', 'rightsStatus': 'UNVERIFIED'},
        'reference': {'officialPage': row['detailUrl'], 'officialDemo': row['normalizedPublicDemoLink'],
                      'demoLinkResolution': row['demoLinkResolution'], 'identityVerifiedAt': row['catalogVerifiedAt'],
                      'catalogSha256': seed['catalogHtmlSha256'], 'manualRoundsObserved': 0,
                      'videoCaptured': False, 'audibleSoundVerified': False},
        'evidence': {'referenceManifestPath': module + '/evidence-index.json', 'rulesSpecPath': module + '/specification.json'},
        'status': 'REFERENCE_PENDING', 'referenceStatus': 'IDENTITY_VERIFIED', 'buildStatus': 'NOT_STARTED',
        'testStatus': 'NOT_RUN', 'deploymentStatus': 'NOT_DEPLOYED',
        'owners': {name: f'{name}-{cohort}' for name in ['reference', 'rules', 'assets', 'frontend', 'backend', 'controls', 'soundAnimation', 'qa']},
        'pathStatus': 'RESERVED_NOT_IMPLEMENTED', 'openDefects': [],
        'nextAction': 'Enter this exact official demo; capture seven completed manual rounds, its controls and in-game rules.',
    })
registry = {
    'schema': 'zplay/new-games72-registry/v1', 'releaseId': 'new-games72-20261121-r1',
    'createdAt': '2026-11-21', 'timeZone': 'Africa/Addis_Ababa', 'targetNewGames': 72,
    'explicitUserNames': 57, 'freshOfficialAdditionalNames': 15,
    'excludedProtectedNames': seed['protectedNamesExcluded'],
    'baselinePath': REL + '/preservation/baseline.json',
    'sourceBaseline': BASE, 'publicActivation': False,
    'implementationNote': 'Reserved identities and paths are not completed games. No old game is counted as a new implementation.',
    'games': games,
}
assert len({g['gameId'] for g in games}) == 72
assert not set(g['gameId'] for g in games).intersection(baseline['gameIds'])
assert not set(g['route'] for g in games).intersection(baseline['routes'])
write_json(ROOT / 'registry.json', registry)
print(json.dumps({'newIdentities': len(games), 'retainedSourceCatalog': len(legacy_games), 'releaseEnabled': False}))
