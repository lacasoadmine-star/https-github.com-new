"""Extract public rules without inventing provider RNG, paylines or features.

These are inputs for the new machines, not executable financial engines. They
remain unlaunchable until a separate implementation passes wallet/browser QA.
"""
import hashlib
import json
import pathlib
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORK = pathlib.Path('/workspace/work/native-batch25')
OUT = ROOT / 'batch25/public-models'
OUT.mkdir(exist_ok=True)
selection = json.loads((ROOT / 'catalog/active-selection.json').read_text())


class Inputs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.values = {}

    def handle_starttag(self, tag, attrs):
        fields = dict(attrs)
        if tag == 'input' and 'id' in fields:
            self.values[fields['id']] = fields.get('value', '')


entries = []
for entry in selection['entries'][1:]:
    name = entry['requestedName']
    folder = WORK / name
    source = folder / 'native-document.html'
    observation = folder / 'native-observation.json'
    if not source.exists() or not observation.exists():
        continue
    record = json.loads(observation.read_text())
    if not record.get('nativeRuntimeReady'):
        continue
    parser = Inputs()
    parser.feed(source.read_text())
    values = parser.values
    box = record['initial']['box']
    info = record['initial']['info']
    document_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    assets = sorted({asset['url']: asset for asset in record['assets']}.values(), key=lambda asset: asset['url'])
    # Public asset addresses only; no DEMO session, player key or REST traffic.
    assets = [{key: row[key] for key in ('url', 'path', 'bytes', 'sha256', 'type')} for row in assets]
    model = {
        'machineId': entry['machineId'], 'requestedName': name,
        'officialGameName': record['initial']['name'],
        'scope': 'Extracted public rules and presentation source inventory',
        'launchable': False, 'engineImplemented': False,
        'providerPrivateRngVerified': False, 'linePathsVerified': False,
        'reference': {'officialPage': record['officialPage'], 'officialDemo': record['officialDemo'], 'observedAt': record['observedAt'], 'documentSha256': document_hash},
        'grid': {'reels': box['column'], 'rows': box['row'], 'columnSort': box['columnSort'], 'symbolCount': box['count']},
        'paytable': json.loads(values['PayTable']),
        'bet': {'lines': info['linePlay'], 'chipCoefficient': str(info['chipCoef']), 'perLineValues': json.loads(values['Bets']), 'minimum': values['MinBetAmount'], 'maximum': values['MaxBetAmount']},
        'limits': {'maximumWin': values['MaxWinAmount'], 'maximumWinMultiplier': record['initial']['data']['Board']['MachineInfo'][0]['MaxWinMultiplier'], 'gambleAttempts': values['DoublingMaxCount'], 'gambleMaximumStake': values['DoublingMaxWin']},
        'observedRuntime': {'nativeSceneLoaded': True, 'nativeBetControlOpened': any(step['action'] == 'Open native bet selector' for step in record['steps']), 'nativeSpinClicked': bool(record.get('spinObserved')), 'superwinWalletVerified': False},
        'presentationAssets': assets,
    }
    target = OUT / (entry['machineId'] + '.json')
    target.write_text(json.dumps(model, indent=2) + '\n')
    entries.append({'machineId': entry['machineId'], 'publicModel': str(target.relative_to(ROOT)), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'assets': len(assets), 'launchable': False})

(OUT / 'manifest.json').write_text(json.dumps({'scope': 'Unpublished batch preparation; not completed machines', 'entries': entries}, indent=2) + '\n')
print(json.dumps({'publicRulesExtracted': len(entries), 'completedFinancialEngines': 0, 'machinesPublished': 0}))
