"""Cache only JetX's public static client files; never capture session traffic."""
import concurrent.futures
import hashlib
import json
import re
from pathlib import Path
import urllib.parse
import urllib.request

WORK = Path('/workspace/work/jetx-sequential')
OUT = WORK / 'assets'
PREFIX = 'https://static.ssg-public.com/cache/b3/JetXNewDemo/'
THEME = 'https://eu-static.ssg-content-2.com/cache/b5/Themes/Default/JetX/'
def allowed(url):
    return url.startswith((PREFIX,THEME,'https://fonts.googleapis.com/','https://fonts.gstatic.com/'))
record = json.loads(Path('/workspace/work/expansion-references/JetX-sequential-loaded.json').read_text())
sources = json.loads(Path('/workspace/work/expansion-references/public-source-index.json').read_text())
cached = {s['url']: Path(s['file']) for s in sources if s['game'] == 'JetX'}
urls = sorted({n['url'] for n in record['record']['network'] if allowed(n['url'])})
document=(WORK/'original-board-response.html').read_text()
urls=sorted(set(urls)|{u for u in re.findall(r'<(?:img|source|video)[^>]+(?:src|poster)=[\'"]([^\'"]+)',document,re.I) if allowed(u)})
game_script=next(Path(s['file']).read_text() for s in sources if s['game']=='JetX' and '/index.js' in s['url'])
urls=sorted(set(urls)|{PREFIX+'Content/SoundNew/'+name for name in re.findall(r"url:\s*'([^']+\.mp3)'",game_script)})

def fetch(url):
    if url.startswith(PREFIX):relative=url.split(PREFIX,1)[1]
    elif url.startswith(THEME):relative='Theme/'+url.split(THEME,1)[1]
    else:relative='Fonts/'+hashlib.sha256(url.encode()).hexdigest()[:24]+('.css' if urllib.parse.urlsplit(url).hostname=='fonts.googleapis.com' else Path(urllib.parse.urlsplit(url).path).suffix)
    relative = urllib.parse.unquote(relative).split('?',1)[0]
    if '..' in Path(relative).parts:
        raise ValueError('unsafe path')
    path = OUT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        if url in cached:
            data = cached[url].read_bytes()
        else:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=45) as response:
                data = response.read(25 * 1024 * 1024 + 1)
        if len(data) > 25 * 1024 * 1024:
            raise ValueError('asset exceeds deployment limit')
        path.write_bytes(data)
    data = path.read_bytes()
    return {'url': url, 'path': relative, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    assets = list(pool.map(fetch, urls))
    seen=set(urls)
    # CSS can reference fonts and images that load only on other screen sizes.
    while True:
        extra=set()
        for asset in assets:
            if not asset['path'].endswith('.css'):
                continue
            for value in re.findall(r'url\([\s\'"]*([^\)\'"\s]+)',(OUT/asset['path']).read_text()):
                url=urllib.parse.urljoin(asset['url'],value)
                if allowed(url) and url not in seen:
                    extra.add(url)
        if not extra: break
        seen.update(extra);assets.extend(pool.map(fetch,sorted(extra)))
(WORK / 'asset-manifest.json').write_text(json.dumps({'gameId': 'jetx_native', 'assets': assets}, indent=2) + '\n')
print(json.dumps({'game': 'JetX', 'assets': len(assets), 'bytes': sum(a['bytes'] for a in assets)}))
