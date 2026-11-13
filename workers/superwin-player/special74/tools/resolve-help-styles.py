"""Resolve stale slot-help stylesheet references to captured launcher styles.

The provider's 404 URL remains a failed URL. These are independently observed
same-title alternatives, not fabricated downloads at the failed location.
"""
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

PACKAGE = Path(__file__).resolve().parents[1]
REPO = PACKAGE.parents[2]
REPORT = REPO / 'reports/special74'


def resolve(manifest, package):
    candidates = {}
    for asset in manifest['assets']:
        url = urlsplit(asset['source'])
        match = re.fullmatch(r'/cache/b\d+/GameLauncher/Content/Help/Styles/([A-Za-z0-9]+\.css)', url.path)
        if url.hostname == 'static.ssg-public.com' and match and asset.get('evidence'):
            candidates.setdefault(match[1], []).append(asset)
    resolutions = []
    for failure in manifest['failures']:
        url = urlsplit(failure['source'])
        match = re.fullmatch(r'/cache/b\d+/SlotsDemo/Content/Help/Styles/([A-Za-z0-9]+\.css)', url.path)
        if url.hostname != 'static.ssg-public.com' or not match:
            continue
        same_title = [a for a in candidates.get(match[1], []) if set(a['gameIds']) & set(failure['gameIds'])]
        # Distinct captured revisions need review; don't choose by filename alone.
        if not same_title or len({a['sha256'] for a in same_title}) != 1:
            continue
        asset = sorted(same_title, key=lambda a: a['source'])[0]
        path = (package / asset['path']).resolve()
        if not path.is_relative_to((package / 'assets/observed').resolve()):
            raise ValueError('Invalid verified asset path')
        data = path.read_bytes()
        if len(data) != asset['bytes'] or hashlib.sha256(data).hexdigest() != asset['sha256']:
            raise ValueError('Changed captured stylesheet: ' + asset['source'])
        resolutions.append({'requestedSource': failure['source'], 'source': asset['source'],
                            'path': asset['path'], 'sha256': asset['sha256'], 'bytes': len(data),
                            'gameIds': sorted(set(asset['gameIds']) & set(failure['gameIds'])),
                            'evidence': asset['evidence'], 'kind': 'observed-same-title-launcher-stylesheet',
                            'originalUrlStillUnavailable': True})
    return resolutions


if __name__ == '__main__':
    manifest = json.loads((REPORT / 'all74-media-manifest.json').read_text())
    resolutions = resolve(manifest, PACKAGE)
    output = {'schemaVersion': 1, 'scope': 'Verified local alternatives for stale public help stylesheet URLs; no production deployment or provider-server fix',
              'originalFailedUrls': len(manifest['failures']), 'resolvedLocalReferences': len(resolutions),
              'unresolvedReferences': len(manifest['failures']) - len(resolutions), 'resolutions': resolutions}
    (REPORT / 'help-style-resolutions.json').write_text(json.dumps(output, indent=2) + '\n')
    print(json.dumps({k: v for k, v in output.items() if k != 'resolutions'}))
