"""Restore the exact public artwork/audio used by NEW74; no demo code or accounts."""
import hashlib
import json
import pathlib
import subprocess

root = pathlib.Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'assets-manifest.json').read_text())
for item in manifest['files']:
    if not item['path'].startswith('assets/'):
        continue
    destination = root / item['path']
    if destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest() == item['sha256']:
        continue
    source = item['source']
    if not source.startswith('https://static.ssg-public.com/cache/b1/SlotsDemo/Content/'):
        raise ValueError('Unexpected asset origin')
    destination.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location', '--max-time', '60', source, '-o', str(destination)], check=True)
    if hashlib.sha256(destination.read_bytes()).hexdigest() != item['sha256']:
        destination.unlink()
        raise ValueError('Asset changed at source: ' + item['path'])
    print(item['path'])
