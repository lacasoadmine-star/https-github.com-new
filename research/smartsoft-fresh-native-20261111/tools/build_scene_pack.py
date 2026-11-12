#!/usr/bin/env python3
"""Build interactive-rendering inputs exclusively from this fresh native run."""
import argparse,hashlib,json,mimetypes,re,shutil
from pathlib import Path
from urllib.parse import unquote,urlsplit,urljoin
ROOT=Path(__file__).resolve().parents[1]
def read(p,fallback=None):
 try:return json.loads(p.read_text())
 except (OSError,json.JSONDecodeError):return fallback

def normalized(url):return unquote(url).split('?')[0]
def digest(data):return hashlib.sha256(data).hexdigest()
def build(gid):
 source=ROOT/'games'/gid;out=ROOT/'native-machines'/gid;assets=out/'assets';assets.mkdir(parents=True,exist_ok=True)
 manifests=[read(source/'09-network/capture-manifest.json',{}),read(source/'09-network/lazy-resource-manifest.json',{})]
 for p in (source/'attempts').glob('*/09-network/capture-manifest.json'):manifests.append(read(p,{}))
 records={normalized(a['source_url']):a for m in manifests for a in m.get('assets',[]) if 'source_url'in a}
 records.update({normalized(a['source_url']):a for a in manifests[0].get('assets',[]) if 'source_url'in a})
 index={};provenance={}
 for url,record in records.items():
  path=ROOT/record['path']
  if not path.is_file():continue
  extension=path.suffix.lower()
  if extension not in ['.png','.webp','.jpg','.jpeg','.json','.txt','.woff','.woff2','.ttf','.otf','.mp3','.ogg']:continue
  data=path.read_bytes()
  if extension=='.json':
   value=read(path,{})
   if not isinstance(value,dict) or not ('bones'in value or isinstance(value.get('frames'),dict)):continue
  if extension=='.txt' and 'atlas'not in path.name.lower():continue
  sha=digest(data);name=sha[:24]+extension
  (assets/name).write_bytes(data);index[url]=name;provenance[name]={'sha256':sha,'bytes':len(data),'source_url':record['source_url'],'source_path':record['path']}
 cfg=read(source/'05-reels-system/public-client-configuration.json',{})
 frame=next((f for f in cfg.get('frames',[]) if f.get('slot')),None)
 if not frame:raise ValueError('No observed native slot configuration: '+gid)
 resources=frame.get('resources',{})
 sheets=[];spines=[]
 for url,name in list(index.items()):
  if not name.endswith('.json'):continue
  data=read(assets/name,{})
  if isinstance(data.get('frames'),dict):
   image=index.get(normalized(urljoin(url,data.get('meta',{}).get('image',''))))
   if image:sheets.append({'json':name,'image':image})
  if 'bones'in data:
   atlas_url=url.rsplit('.',1)[0]+'.atlas.txt';atlas=index.get(atlas_url)
   if not atlas:continue
   text=(assets/atlas).read_text();pages={}
   for line in text.splitlines():
    if line and not line[0].isspace()and re.search(r'\.(?:png|webp|jpg)$',line,re.I):
     page=index.get(normalized(urljoin(atlas_url,line.strip())))
     if page:pages[line.strip()]=page
   aliases=[]
   for alias,value in (resources.get('spines')or{}).items():
    if isinstance(value,dict) and url.replace('.webp.json','.json').endswith('/'+unquote(value.get('url',''))):aliases.append(alias)
   if not pages:continue
   spines.append({'json':name,'atlas':atlas,'pages':pages,'aliases':aliases,'animations':list(data.get('animations',{})),'bones':[b['name']for b in data.get('bones',[])]})
 poses={}
 for key,p in [('portrait',source/'05-reels-system/fresh-native-scene.json'),('portrait-short',source/'05-reels-system/scene-phone-short-320x568.json'),('landscape',source/'05-reels-system/scene-phone-landscape-844x390.json'),('portrait-after',source/'05-reels-system/scene-mobile-390x844.json')]:
  d=read(p,{})
  s=next((x for x in d.get('scenes',[])if x.get('stageFound')),None)
  if s:poses[key]=s
 if not poses:raise ValueError('No native scene observed: '+gid)
 # Keep only original rendering libraries; provider networking/game engines are excluded.
 libraries={}
 for suffix,alias in [('-pixi.js','pixi'),('-pixi-spine.js','spine'),('-pixi-multi-text.js','multitext')]:
  p=next(source.glob('12-client-code/*'+suffix),None)
  if not p:raise ValueError('Missing observed rendering library '+alias)
  data=p.read_bytes();name='runtime-'+alias+'.js';target=ROOT/'native-machines/shared/assets'/name;target.parent.mkdir(exist_ok=True);target.write_bytes(data);libraries[alias]='/independent74/native/shared/assets/'+name
 fonts=[]
 for record in records.values():
  p=ROOT/record['path']
  if not p.is_file()or p.suffix!='.css':continue
  for block in re.findall(r'@font-face\s*\{[^}]*\}',p.read_text(errors='replace'),re.I):
   def replace(m):
    raw=m.group(1).strip(' \"\'');url=normalized(urljoin(record['source_url'],raw));name=index.get(url)
    return 'url("assets/'+name+'")'if name else m.group(0)
   mapped=re.sub(r'url\(([^)]+)\)',replace,block)
   if mapped!=block:fonts.append(mapped)
 (out/'fonts.css').write_text('\n'.join(dict.fromkeys(fonts)))
 backgrounds={}
 for url,name in index.items():
  if re.search(r'/Images/(?:Vertical/)?background\.(?:jpg|png|webp)$',url,re.I):backgrounds['portrait' if '/Vertical/'in url else 'landscape']=name
 sound_aliases={}
 for alias,value in (resources.get('sounds')or{}).items():
  if not isinstance(value,dict):continue
  suffix='/'+unquote(value.get('url',''))
  matches=[file for url,file in index.items()if url.endswith(suffix)]
  if len(set(matches))==1:sound_aliases[alias]=matches[0]
 image_aliases={k:v.get('url','').rsplit('.',1)[0]for k,v in (resources.get('images')or{}).items()if isinstance(v,dict)}
 pack={'schema':1,'officialId':gid,'name':next(g['name']for g in read(ROOT/'catalogues/smartsoft-games.json')['games']if g['id']==gid),'assetBase':'/independent74/native/scene-v2-'+gid+'/assets/','libraries':libraries,'backgrounds':backgrounds,'images':index,'sheets':sheets,'spines':spines,'imageAliases':image_aliases,'poses':poses,'nativeSlot':{k:frame['slot'].get(k) for k in ['boxes','buttons','lines','canvas']},'providerServerSourceUsed':False,'userScreenshotsUsed':False,'rejectedRendererUsed':False}
 backend_ids={'multi-hot-100':'multihot100_native','multi-hot-5-deluxe':'multihotdeluxe_native','multi-hot-wild-ways':'multihotwildways_native','multi-hot-5-wild':'multihot5wild_native','multi-hot-5-super-wilds':'multihot5superwilds_native','hab':'habeshafortune5_native','burning-ice-41':'burningice_native','blazing-hot-10':'burningice10_native','burning-ice-40':'burningice40_native'}
 if gid in backend_ids:
  backend=read(Path('/workspace/superwin-existing-integration/reports/native9')/(backend_ids[gid]+'-game.json'),{})
  # Existing authenticated API contract only, never a source of artwork/layout.
  backend={k:v for k,v in backend.items()if not k.startswith('reference')and k not in ['theme','releaseGate','officialReference']}
  backend['launchable']=True;backend['published']=True
  backend['symbols']=[{k:v for k,v in symbol.items()if k not in ['mark','color']}for symbol in backend['symbols']]
  pack['backendGame']=backend
  pack['backendToNative']={str(i):i for i in range(len(backend['symbols']))}
  if gid in ['multi-hot-wild-ways','multi-hot-5-wild']:pack['backendToNative']={'0':9,**{str(i):i-1 for i in range(1,10)}}
  if gid=='burning-ice-40':pack['backendToNative']['9']=10
 pack['soundAliases']=sound_aliases
 (out/'profile.json').write_text(json.dumps(pack,separators=(',',':')))
 (out/'asset-provenance.json').write_text(json.dumps(provenance,indent=2))
 return {'id':gid,'files':len(provenance),'bytes':sum(x['bytes']for x in provenance.values()),'sheets':len(sheets),'spines':len(spines),'poses':list(poses)}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('ids',nargs='+');a=p.parse_args()
 for gid in a.ids:
  try:print(json.dumps(build(gid)),flush=True)
  except Exception as e:print(json.dumps({'id':gid,'error':str(e)}),flush=True)
