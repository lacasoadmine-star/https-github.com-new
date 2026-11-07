"""Refresh official pages and public DEMO launchers; never uses player uploads.

Downloaded HTML stays in a scratch directory. The committed report contains
public URLs and hashes only. A successful HTTP response alone is not proof that
a game exists, because the launcher also returns HTTP 200 for error pages.
"""
import concurrent.futures
import datetime
import hashlib
import html
import json
import pathlib
import re
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = pathlib.Path('/workspace/work/native-batch25')
CACHE.mkdir(parents=True, exist_ok=True)
NAMES = json.loads((ROOT / 'catalog/latest-requested-queue.json').read_text())['names']
SNAPSHOT = json.loads((ROOT / 'catalog/official-smartsoft-snapshot.json').read_text())['entries']
normalize = lambda value: re.sub('[^a-z0-9]', '', value.lower())
INDEX = {normalize(row['name']): row for row in SNAPSHOT}


def fetch(url, output):
    try:
        response = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=35)
        body = response.read()
        output.write_bytes(body)
        return {'url': url, 'finalUrl': response.url, 'status': response.status, 'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()}, body.decode('utf-8', 'replace')
    except (urllib.error.URLError, TimeoutError) as error:
        return {'url': url, 'error': str(error)}, ''


def capture(name):
    row = INDEX.get(normalize(name))
    # Preserve the requested identity and disclose this nearest-title mapping.
    if name == 'MultiHotDeluxe':
        row = INDEX.get('multihot5deluxe')
    folder = CACHE / name
    folder.mkdir(exist_ok=True)
    evidence = {'requestedName': name, 'provider': 'SmartSoft' if row else 'unresolved', 'officialIndexMatch': bool(row), 'mapping': 'MultiHotDeluxe → Multi Hot 5 Deluxe; exact requested title absent from index' if name == 'MultiHotDeluxe' else None}
    if row:
        page, text = fetch(row['url'], folder / 'page.html')
        evidence['page'] = page
        title = re.search(r'<title[^>]*>(.*?)</title>', text, re.S | re.I)
        evidence['officialTitle'] = html.unescape(title.group(1)) if title else row['name'].strip()
        # Use today's page link before falling back to the historical snapshot.
        links = [html.unescape(value) for value in re.findall(r'(?:href|src)=["\']([^"\']+)', text)]
        demo = next((value for value in links if 'ssgportal.com/GameLauncher/' in value and 'Token=DEMO' in value), None) or row.get('demo_url')
        demo = urllib.parse.urljoin('https://www.smartsoftgaming.com', demo) if demo else None
    else:
        # This is a probe, not a verified reference or a substitute title.
        demo = 'https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?' + urllib.parse.urlencode({'GameCategory': 'Slots', 'GameName': name, 'Token': 'DEMO', 'PortalName': 'DEMO', 'Lang': 'en'})
    if demo:
        result, text = fetch(demo, folder / 'launcher.html')
        evidence['demo'] = result
        evidence['declaredGameName'] = urllib.parse.parse_qs(urllib.parse.urlsplit(demo).query).get('GameName', [None])[0]
        evidence['documentTitle'] = html.unescape(re.search(r'<title[^>]*>(.*?)</title>', text, re.S | re.I).group(1)) if re.search(r'<title[^>]*>(.*?)</title>', text, re.S | re.I) else None
        evidence['errors'] = list(dict.fromkeys(re.findall(r'.{0,45}(?:not found|not exist|invalid game|game unavailable|error.{0,10}occurred).{0,100}', text, re.I)))[:5]
        evidence['scripts'] = [urllib.parse.urljoin(result.get('finalUrl', demo), html.unescape(src)) for src in re.findall(r'<script[^>]+src=["\']([^"\']+)', text, re.I)]
        evidence['runtimeVerified'] = False
    return evidence


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    entries = list(pool.map(capture, NAMES))
report = {'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'scope': '25 remaining new machines; reference capture only, not playable games', 'source': 'Official SmartSoft pages and public DEMO launchers', 'entries': entries}
output = ROOT / 'batch25/official-reference-status.json'
output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
print(json.dumps({'entries': len(entries), 'currentPageMatches': sum(bool(row.get('page', {}).get('status') == 200) for row in entries), 'launchResponses': sum(bool(row.get('demo', {}).get('status') == 200) for row in entries), 'report': str(output)}))
for row in entries:
    print(json.dumps({'name': row['requestedName'], 'pageMatch': row['officialIndexMatch'], 'final': row.get('demo', {}).get('finalUrl'), 'title': row.get('documentTitle'), 'errors': row.get('errors'), 'networkError': row.get('demo', {}).get('error')}, ensure_ascii=False))
