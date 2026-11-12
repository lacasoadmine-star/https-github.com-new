"""Archive fresh public provider descriptions; these are not runtime verification."""
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
import datetime, hashlib, json, os, subprocess

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / 'reports/special74/fresh-official-pages'

class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__(); self.excluded = 0; self.parts = []
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'noscript'): self.excluded += 1
    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript'): self.excluded = max(0, self.excluded - 1)
    def handle_data(self, data):
        value = ' '.join(data.split())
        if value and not self.excluded: self.parts.append(value)

def fetch(entry):
    url = entry['officialIdentity']['url']
    if not url.startswith('https://www.smartsoftgaming.com/games/'):
        raise ValueError('Unexpected official source')
    result = subprocess.run(['curl', '--silent', '--show-error', '--fail', '--location',
        '--max-time', '40', '--proxy', os.environ['HTTPS_PROXY'], url], capture_output=True)
    evidence = dict(id=entry['id'], title=entry['selectedName'], url=url,
        fetchedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        sourceType='provider-marketing-page; runtime rules take precedence')
    if result.returncode:
        evidence.update(status='fetch-failed', error=result.stderr.decode(errors='replace')[:400])
    else:
        parser = VisibleText(); parser.feed(result.stdout.decode(errors='replace'))
        text = '\n'.join(parser.parts) + '\n'
        target = OUT / (entry['id'] + '.txt'); target.write_text(text)
        evidence.update(status='archived', textPath=str(target.relative_to(ROOT)),
            sourceSha256=hashlib.sha256(result.stdout).hexdigest(),
            textSha256=hashlib.sha256(text.encode()).hexdigest())
    print(json.dumps({'name': entry['selectedName'], 'status': evidence['status']}), flush=True)
    return evidence

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    entries = json.loads((ROOT/'reports/special74/selected-games.json').read_text())['entries']
    with ThreadPoolExecutor(max_workers=4) as pool: results = list(pool.map(fetch, entries))
    (OUT/'index.json').write_text(json.dumps(results, indent=2) + '\n')
