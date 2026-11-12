"""Download observed presentation media only; never provider executable game code."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'https://static.ssg-public.com/cache/b1/SlotsDemo/Content/'
EXTENSIONS = ('.png', '.webp', '.jpg', '.mp3', '.ogg', '.otf', '.woff', '.woff2', '.json', '.atlas.txt')

def download(url):
    if not url.startswith(PREFIX) or not urlsplit(url).path.endswith(EXTENSIONS):
        raise ValueError('Non-media source: ' + url)
    rel = unquote(url[len(PREFIX):]).split('?')[0]
    if '..' in Path(rel).parts or not rel.startswith(('Images/BlazingHot/', 'Sound/BlazingHot/', 'Fonts/')):
        raise ValueError('Outside this game presentation: ' + rel)
    out = ROOT / 'assets' / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    if not out.exists():
        temporary = out.with_name(out.name + '.download')
        subprocess.run(['curl', '--proxy', os.environ.get('HTTPS_PROXY', ''), '-fLsS', '--max-time', '60', '--retry', '1', url, '-o', str(temporary)], check=True)
        if out.suffix == '.json':
            json.loads(temporary.read_text())
        temporary.replace(out)
    data = out.read_bytes()
    return {'source': url, 'path': 'assets/' + rel, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}

if __name__ == '__main__':
    urls = json.loads(Path(sys.argv[1]).read_text())
    urls = list(dict.fromkeys(u for u in urls if u.startswith(PREFIX) and urlsplit(u).path.endswith(EXTENSIONS) and u[len(PREFIX):].startswith(('Images/BlazingHot/', 'Sound/BlazingHot/', 'Fonts/'))))
    results, failures = [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        tasks = {pool.submit(download, u): u for u in urls}
        for task in concurrent.futures.as_completed(tasks):
            try:
                results.append(task.result())
            except Exception as error:
                failures.append({'url': tasks[task], 'error': str(error)})
    manifest = {'assets': sorted(results, key=lambda x: x['path']), 'failures': failures}
    (ROOT / 'media-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'downloaded': len(results), 'bytes': sum(x['bytes'] for x in results), 'failures': failures}))
    if failures:
        sys.exit(1)
