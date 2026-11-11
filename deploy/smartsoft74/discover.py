"""Fetch the provider's current public catalogue and product descriptions."""
import concurrent.futures,hashlib,html,json,re,urllib.request
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).parent
URL='https://www.smartsoftgaming.com/games'
def fetch(url):
 with urllib.request.urlopen(url,timeout=30) as r:return r.read()
def text(markup):
 markup=re.sub(r'<(?:script|style)\b[^>]*>.*?</(?:script|style)>','',markup,flags=re.S|re.I)
 markup=re.sub(r'<(?:br|/p|/div|/h[1-6]|/li)[^>]*>','\n',markup,flags=re.I)
 return '\n'.join(line.strip() for line in html.unescape(re.sub('<[^>]+>',' ',markup)).splitlines() if line.strip())
def discover():
 raw=fetch(URL);s=raw.decode();games=[]
 for chunk in re.split(r'<div role="listitem" class="games_item w-dyn-item">',s)[1:]:
  page=re.search(r'href="(/games/[^\"]+)"',chunk);demo=re.search(r'href="([^\"]*(?:ssgportal|google.com/url)[^\"]*)"',chunk);image=re.search(r'<img src="([^"]+)"[^>]*alt="([^"]*)"',chunk)
  if not page or not image:continue
  cat=re.search(r'fs-cmsfilter-field="category"[^>]*>([^<]*)',chunk)
  games.append({'id':page[1].split('/')[-1],'name':html.unescape(image[2]).strip(),'officialPage':'https://www.smartsoftgaming.com'+page[1],'demo':html.unescape(demo[1]) if demo else None,'cover':image[1],'category':html.unescape(cat[1]) if cat else None})
 if len(games)!=74:raise RuntimeError('Provider catalogue count changed; inspect the current list: '+str(len(games)))
 def product(game):
  body=fetch(game['officialPage']);plain=text(body.decode());(ROOT/'references'/(game['id']+'.txt')).write_text(plain)
  game['pageSha256']=hashlib.sha256(body).hexdigest();game['observedAt']=datetime.now(timezone.utc).isoformat();return game
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:games=list(pool.map(product,games))
 out={'source':URL,'observedAt':datetime.now(timezone.utc).isoformat(),'catalogueSha256':hashlib.sha256(raw).hexdigest(),'count':len(games),'games':games}
 (ROOT/'official-catalogue.json').write_text(json.dumps(out,indent=2)+'\n')
 print('Fresh official product descriptions:',len(games))
if __name__=='__main__':discover()
