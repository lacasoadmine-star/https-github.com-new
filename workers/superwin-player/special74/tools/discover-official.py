"""Read a fresh public provider catalogue; do not infer game identity from demo guesses."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin,urlsplit,parse_qs
import json,sys,datetime

class DOM(HTMLParser):
 def __init__(self):
  super().__init__();self.root={'tag':'root','attrs':{},'children':[]};self.stack=[self.root]
 def handle_starttag(self,tag,attrs):
  n={'tag':tag,'attrs':dict(attrs),'children':[]};self.stack[-1]['children'].append(n)
  if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:self.stack.append(n)
 def handle_startendtag(self,tag,attrs):self.handle_starttag(tag,attrs);self.handle_endtag(tag)
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i]['tag']==tag:self.stack=self.stack[:i];break
 def handle_data(self,data):self.stack[-1]['children'].append(data)

def nodes(n):
 yield n
 for c in n['children']:
  if isinstance(c,dict):yield from nodes(c)
def text(n):return ' '.join((c if isinstance(c,str) else text(c)).strip() for c in n['children']).strip()

if __name__=='__main__':
 dom=DOM();dom.feed(Path(sys.argv[1]).read_text());games=[]
 for card in nodes(dom.root):
  if 'games_item' not in card['attrs'].get('class','').split():continue
  descendants=list(nodes(card));links=[x['attrs'].get('href','') for x in descendants if x['tag']=='a']
  page=next((x for x in links if x.startswith('/games/')),None)
  if not page:continue
  demos=list(dict.fromkeys(x for x in links if 'GameLauncher' in x))
  images=[x['attrs'] for x in descendants if x['tag']=='img']
  fields={x['attrs']['fs-cmsfilter-field']:text(x) for x in descendants if 'fs-cmsfilter-field' in x['attrs']}
  name=next((x.get('alt','').strip() for x in images if x.get('alt','').strip()),page.rsplit('/',1)[-1])
  game={'name':name,'officialPage':urljoin('https://www.smartsoftgaming.com',page),'demoUrl':demos[0] if demos else None,'fields':fields,'cover':next((x.get('src') for x in images if x.get('src')),None)}
  if game['demoUrl']:
   raw=game['demoUrl'];normalized=raw if raw.startswith('http') else 'https://'+raw
   if urlsplit(normalized).hostname=='www.google.com':normalized=parse_qs(urlsplit(normalized).query).get('q',[''])[0]
   query=parse_qs(urlsplit(normalized).query);game['normalizedDemoUrl']=normalized;game['launchGameName']=query.get('GameName',[None])[0];game['explicitDemoToken']=query.get('Token',[''])[0].upper() in ('DEMO','DEMO_EXH')
  games.append(game)
 result={'source':'https://www.smartsoftgaming.com/games','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'games':games}
 Path(sys.argv[2]).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'games':len(games),'explicitDemoLinks':sum(x.get('explicitDemoToken',False) for x in games)}))
