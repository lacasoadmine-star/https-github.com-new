"""Read-only release verification. Never posts a spin, gamble, or account action."""
import argparse
import concurrent.futures
import hashlib
import json
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--stage', required=True)
parser.add_argument('--before', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--base', default='https://superwin-player.apdiy61.workers.dev')
parser.add_argument('--launch-only', action='store_true')
args = parser.parse_args()
if args.base != 'https://superwin-player.apdiy61.workers.dev':
    raise SystemExit('Use the existing verified Player origin.')
stage = Path(args.stage)
packages = json.loads((stage / 'package-report.json').read_text())['packages']
before = json.loads(Path(args.before).read_text())
jobs = []
for package in packages:
    name = package['name']
    if not re.fullmatch(r'[a-z][a-z0-9_-]*', name):
        raise SystemExit(f'Invalid package name: {name}')
    manifest_bytes = (stage / (name + '-manifest.json')).read_bytes()
    if hashlib.sha256(manifest_bytes).hexdigest() != package['manifestSha256']:
        raise SystemExit(f'Manifest hash mismatch: {name}')
    manifest = json.loads(manifest_bytes)
    release = manifest['release']
    if 'gameId' in manifest:
        path = manifest.get('accountPath', '/games/' + manifest['gameId'])
        scripts = re.findall(r'\bsrc="(/' + re.escape(release) + r'/[^"?]+\.mjs(?:\?[^\"]*)?)"', manifest['htmlTemplate'])
        if not scripts or any(src.split('?', 1)[0].rsplit('/', 1)[-1] not in manifest['assets'] for src in scripts):
            raise SystemExit(f'Missing pinned bootstrap script: {name}')
        jobs.append(dict(path=path, release=release, scripts=scripts))
    if not args.launch_only:
        for filename, asset in manifest['assets'].items():
            jobs.append(dict(path='/' + release + '/' + filename, release=release, **asset))
protected = {'/', '/games/multi_hot_5_native', '/games/foxy_hot_20_native', '/games/multi_hot_5_video', '/games/hot_foxy_20'}
for old in before:
    if old['path'] in protected:
        jobs.append(dict(path=old['path'], sha256=old['sha256'], size=old['bytes'], protected=True))

def check(job):
    with tempfile.TemporaryDirectory(prefix='native72-http-') as directory:
        body = Path(directory) / 'body'
        headers = Path(directory) / 'headers'
        request = subprocess.run(['curl', '--silent', '--show-error', '--location', '--max-time', '30',
                                  '-D', str(headers), '-o', str(body), '-w', '%{http_code}',
                                  args.base + job['path']], capture_output=True, text=True)
        if request.returncode:
            return dict(path=job['path'], ok=False, error='curl:' + str(request.returncode))
        data = body.read_bytes()
        raw_headers = headers.read_text()
        response = {}
        for line in raw_headers.splitlines():
            if ':' in line:
                key, value = line.split(':', 1)
                response[key.lower()] = value.strip()
        errors = []
        if request.stdout != '200':
            errors.append('HTTP_' + request.stdout)
        if 'release' in job and response.get('x-zplay-release') != job['release']:
            errors.append('release')
        digest = hashlib.sha256(data).hexdigest()
        if 'sha256' in job and digest != job['sha256']:
            errors.append('sha256')
        if 'size' in job and len(data) != job['size']:
            errors.append('length')
        if 'type' in job and response.get('content-type') != job['type']:
            errors.append('mime')
        if 'scripts' in job:
            if not response.get('content-type', '').startswith('text/html'):
                errors.append('mime')
            text = data.decode('utf8', errors='replace')
            if '{{GAME}}' in text or '{{PRESENTATION_GAME}}' in text:
                errors.append('unresolved_identity')
            if any(script not in text for script in job['scripts']):
                errors.append('bootstrap')
            if 'presence.63ed199a80b6c700.mjs' not in text:
                errors.append('presence')
            if 'Local QA' in text or '/__qa/' in text:
                errors.append('mock_content_in_production')
        return dict(path=job['path'], ok=not errors, status=int(request.stdout), bytes=len(data),
                    sha256=digest, release=response.get('x-zplay-release'), errors=errors)

results = []
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    futures = [executor.submit(check, job) for job in jobs]
    for result in concurrent.futures.as_completed(futures):
        results.append(result.result())
        if len(results) % 40 == 0:
            print(json.dumps(dict(completed=len(results), total=len(jobs), failed=sum(not r['ok'] for r in results))), flush=True)
report = dict(verified_at=datetime.now(timezone.utc).isoformat(), method='read-only public HTTP GET via curl',
              production_transactions=0, total=len(results), passed=sum(r['ok'] for r in results),
              failed=sum(not r['ok'] for r in results), bytes=sum(r.get('bytes', 0) for r in results),
              results=sorted(results, key=lambda r: r['path']))
Path(args.output).write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: v for k, v in report.items() if k != 'results'}, indent=2), flush=True)
if report['failed']:
    print(json.dumps([r for r in report['results'] if not r['ok']], indent=2), flush=True)
    raise SystemExit(1)
