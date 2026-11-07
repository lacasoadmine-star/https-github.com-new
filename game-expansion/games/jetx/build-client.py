"""Build the isolated JetX presentation from its captured public reference."""
from pathlib import Path
import hashlib
import html
import json
import re
import shutil

HERE=Path(__file__).resolve().parent
WORK=Path('/workspace/work/jetx-sequential')
OUT=HERE/'public'
PREFIX='/native-library/jetx/r1/'
BASE='https://static.ssg-public.com/cache/b3/JetXNewDemo/'
THEME='https://eu-static.ssg-content-2.com/cache/b5/Themes/Default/JetX/'
OUT.mkdir(parents=True,exist_ok=True)
if (WORK/'assets').exists():shutil.copytree(WORK/'assets',OUT,dirs_exist_ok=True)
provenance=WORK/'asset-manifest.json' if (WORK/'asset-manifest.json').exists() else HERE/'evidence/reference-assets.json'
original_assets=json.loads(provenance.read_text())['assets']
font_urls={a['url']:PREFIX+a['path'] for a in original_assets if a['path'].startswith('Fonts/')}
for path in OUT.rglob('*'):
 if path.is_file() and path.suffix in ['.js','.css','.json','.atlas']:
  text=path.read_text()
  text=text.replace(BASE,PREFIX).replace(THEME,PREFIX+'Theme/')
  for url,local in sorted(font_urls.items(),key=lambda p:-len(p[0])):text=text.replace(url,local)
  text=text.replace('The RTP of the game ranges from 96.2% to 98.9%, depending on the selected gameplay settings and/or game configuration.','The theoretical return for this Superwin implementation is 97% before rounding and maximum-win limits.').replace('The highest RTP may be achieved when the player selects the lowest available cashout multiplier.','Outcomes are generated on Superwin’s server. The provider’s private outcome distribution is not reproduced.')
  path.write_text(text)

capture=WORK/'original-board-response.html'
source=capture.read_text() if capture.exists() else (OUT/'index.html').read_text()
if "controllerName = 'JetXapi'" not in source and 'client-bridge.js' not in source:
 raise ValueError('Capture did not contain the original JetX game document')
source=re.sub(r'<script\b(?![^>]*src=)[^>]*>.*?</script>','',source,flags=re.S|re.I)
source=re.sub(r'<input\b[^>]*(?:id|name)="__(?:EVENTTARGET|EVENTARGUMENT|VIEWSTATE|VIEWSTATEGENERATOR|EVENTVALIDATION)"[^>]*>','',source,flags=re.I)
def script(match):
 url=html.unescape(match.group(2));lower=url.lower()
 if any(v in lower for v in ['webresource.axd','scriptresource.axd','mixpanel-2-latest','jquery.signalr']):return ''
 if lower.endswith('signalr/hubs'):return f'<script src="{PREFIX}client-bridge.js"></script><script src="{PREFIX}boot.js"></script>'
 if 'locale.ashx' in lower:url=PREFIX+'Content/Scripts/jetx-locale.js'
 tag='<script src="'+html.escape(url,quote=True)+'"></script>'
 if '/JetXNew/chat.js' in url and 'chat-adapter.js' not in source:tag+=f'<script src="{PREFIX}chat-adapter.js"></script>'
 if '/JetXNew/data.js' in url and 'session-adapter.js' not in source:tag+=f'<script src="{PREFIX}session-adapter.js"></script>'
 return tag
source=re.sub(r'<script\b[^>]*\bsrc\s*=\s*([\'"])(.*?)\1[^>]*>\s*</script>',script,source,flags=re.S|re.I)
if source.count('client-bridge.js')!=1 or source.count('boot.js')!=1:raise ValueError('Native transport bootstrap replacement failed')
source=re.sub(r'<form\b[^>]*>', '<div id="form1">',source,flags=re.I).replace('</form>','</div>')
source=re.sub(r'<title>.*?</title>','<title>JetX · Superwin</title>',source,flags=re.S)
source=source.replace(BASE,PREFIX).replace(THEME,PREFIX+'Theme/')
for url,local in font_urls.items():source=source.replace(url,local)
source=source.replace('&quot;CURRENCYCODE&quot;:&quot;DMO&quot;','&quot;CURRENCYCODE&quot;:&quot;ETB&quot;')
source=re.sub(r'(id="IsNetworkOptimized"[^>]*value=")True',r'\1False',source)
source=re.sub(r'(id="currentTime"[^>]*value=")[^"]*',r'\1',source)
source=re.sub(r'(id="stopUrl"[^>]*value=")[^"]*',r'\1/',source)
source=source.replace('The RTP of the game ranges from 96.2% to 98.9%, depending on the selected gameplay settings and/or game configuration.','The theoretical return for this Superwin implementation is 97% before rounding and maximum-win limits.')
source=source.replace('The highest RTP may be achieved when the player selects the lowest available cashout multiplier.','Outcomes are generated on Superwin’s server. The provider’s private outcome distribution is not reproduced.')
if 'DEMO_SESSION_REDACTED' in source or re.search(r'(?:[?&](?:Token|token)=|window.token\s*=\s*"[a-f0-9-]{36})',source):
 raise ValueError('Provider demo session data must not enter the built client')
(OUT/'index.html').write_text(source)
(OUT/'client-bridge.js').write_text((HERE/'client-bridge.js').read_text())
(OUT/'chat-adapter.js').write_text('window.chatRequest=window.JetXNative.chatRequest;\n')
(OUT/'session-adapter.js').write_text("const originalRequestFailure=window.OnRequestFail;window.OnRequestFail=function(...args){if(window.JetXNative.requiresLogin)return;return originalRequestFailure(...args);};\n")
(OUT/'boot.js').write_text("""let controllerName='JetXapi';let baseUrl=location.origin+'/native-library/jetx/r1/';let externalUrl='';
window.hub=$.connection.h;window.token='local';$.connection.hub.start().done(()=>{hubGetList();timerPing();});
window.addEventListener('offline',()=>window.jetX?.showInternetLost());window.addEventListener('online',()=>window.JetXNative?.refresh());
""")
portal=HERE.parents[2]/'player-machines/native-portal'
# The existing portal module retains its authentication, favourites and all
# previous catalogue identities. Only the new machine definition is added.
if not portal.exists():portal=Path('/workspace/superwin/player-machines/native-portal')
(OUT/'portal.mjs').write_text((portal/'portal.mjs').read_text())
catalog=(portal/'native-catalog.mjs').read_text()
catalog=catalog.replace("export const nativeGames=Object.freeze([","export const nativeGames=Object.freeze([\n Object.freeze({id:'jetx_native',title:'JetX',art:'/native-library/jetx/r1/cover.webp'}),")
catalog=catalog.replace("category:'Slots'","category:definition.id==='jetx_native'?'Flight':'Slots'")
(OUT/'native-catalog.mjs').write_text(catalog)
manifest=[]
for path in sorted(OUT.rglob('*')):
 if not path.is_file():continue
 data=path.read_bytes();manifest.append({'path':PREFIX+path.relative_to(OUT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(HERE/'evidence/built-assets.json').write_text(json.dumps({'gameId':'jetx_native','files':manifest,'bytes':sum(f['bytes'] for f in manifest)},indent=2)+'\n')
print(json.dumps({'game':'JetX','files':len(manifest),'bytes':sum(f['bytes'] for f in manifest)}))
