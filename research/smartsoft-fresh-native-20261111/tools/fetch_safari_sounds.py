"""Fetch sound URLs declared by the freshly opened official Safari client."""
import concurrent.futures,hashlib,json,urllib.request
from pathlib import Path
from urllib.parse import quote
root=Path(__file__).resolve().parents[1];game=root/'games/safari-simba-2'
cfg=next(f['resources']for f in json.loads((game/'05-reels-system/public-client-configuration.json').read_text())['frames']if f.get('resources'))
manifest=json.loads((game/'09-network/capture-manifest.json').read_text());bg=next(a['source_url']for a in manifest['assets']if a['source_url'].endswith('/Start/Background.mp3'))
prefix=bg.removesuffix(cfg['sounds']['Background']['url'])
def fetch(item):
 alias,value=item;url=prefix+quote(value['url'],safe='/')
 try:
  data=urllib.request.urlopen(urllib.request.Request(url,headers={'user-agent':'Mozilla/5.0'}),timeout=15).read();sha=hashlib.sha256(data).hexdigest();path=game/'03-sound'/(sha[:20]+'.mp3');path.write_bytes(data)
  return {'source_url':url,'path':str(path.relative_to(root)),'group':'03-sound','sha256':sha,'bytes':len(data),'declared_alias':alias}
 except Exception as e:return {'declared_alias':alias,'error':type(e).__name__}
with concurrent.futures.ThreadPoolExecutor(max_workers=6)as pool:results=list(pool.map(fetch,cfg['sounds'].items()))
(game/'09-network/lazy-resource-manifest.json').write_text(json.dumps({'method':'Freshly observed public client resource declarations','assets':[r for r in results if 'path'in r],'errors':[r for r in results if 'error'in r]},indent=2))
print(json.dumps({'downloaded':sum('path'in r for r in results),'errors':[r for r in results if 'error'in r]}))
