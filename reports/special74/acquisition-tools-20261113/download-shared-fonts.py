import hashlib,json,subprocess,re,importlib.util
from pathlib import Path
from urllib.parse import urljoin,urlsplit
repo=Path.cwd();package=repo/'workers/superwin-player/special74'
s=importlib.util.spec_from_file_location('media',package/'tools/fetch-all-media.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
base='https://static.ssg-public.com/cache/b5/Themes/Default/JetX/Styles/fonts.css'
queue=[base];seen=set();results=[]
while queue:
 url=queue.pop(0)
 if url in seen:continue
 seen.add(url)
 result={'source':url,'scope':'Shared provider font assets, separate from per-game completeness'}
 p=urlsplit(url)
 if p.hostname!='static.ssg-public.com' or not p.path.startswith('/cache/b5/Themes/Default/JetX/'):raise ValueError('Unexpected font source')
 response=subprocess.run(['curl','--fail','--silent','--show-error','--location','--proto','=https','--proto-redir','=https','--max-time','20',url],capture_output=True)
 if response.returncode:result.update(verified=False,error=response.stderr.decode()[:300]);results.append(result);continue
 data=response.stdout
 try:
  if p.path.endswith('.eot'):
   if len(data)<36 or data[34:36]!=b'LP' or int.from_bytes(data[:4],'little')!=len(data):raise ValueError('Invalid EOT font')
   mime='application/vnd.ms-fontobject'
  else:mime=m.validate_content(url,data)
  dest=package/'assets/observed'/p.hostname/p.path.lstrip('/');dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
  result.update(verified=True,path=str(dest.relative_to(package)),sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),mime=mime)
  if mime=='text/css':
   for v in re.findall(r"url\(['\"]?([^)'\"]+)",data.decode()):
    candidate=urlsplit(urljoin(url,v));queue.append(candidate._replace(query='',fragment='').geturl())
 except Exception as error:result.update(verified=False,error=str(error))
 results.append(result)
out=repo/'reports/special74/fresh-shared-font-downloads-20261113.json';out.write_text(json.dumps({'originalUnavailableHost':'static.static-ssgmrr17.xyz','officialCDNAvailable':True,'demoRuntimeModified':False,'assets':results},indent=2)+'\n');print(json.dumps({'downloaded':sum(x['verified'] for x in results),'failed':sum(not x['verified']for x in results)}))
