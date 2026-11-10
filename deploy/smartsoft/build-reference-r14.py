"""Build the presentation-only bundle from public source art and retained manifests.

All downloaded images keep their original bytes. SHA-256, byte sizes, source
URLs and the changed manifests are included in the release inventory.
"""
import base64, gzip, hashlib, json, mimetypes, subprocess
from pathlib import Path
from urllib.parse import urljoin
from PIL import Image

ROOT=Path(__file__).resolve().parent
CACHE=ROOT/'.reference-r14-cache'
ORIGIN='https://superwin-player.apdiy61.workers.dev'
PREFIX='/native-library/remaining20/20261110-reference-mobile-r14/'
MOBILE='https://static.ssg-public.com/cache/b1/SlotsDemo/Content/Images/BlazingHot/Mobile/'
CACHE.mkdir(exist_ok=True)
hashbytes=lambda b:hashlib.sha256(b).hexdigest()
def read(url):
 p=CACHE/hashlib.sha256(url.encode()).hexdigest()
 if not p.exists():subprocess.run(['curl','-fsS','--max-time','30','--retry','2',url,'-o',str(p)],check=True)
 return p.read_bytes()
def normalized(name,frame,file,sha):
 r=frame['frame'];tr=frame.get('spriteSourceSize',dict(x=0,y=0,w=r['w'],h=r['h']));orig=frame.get('sourceSize',dict(w=r['w'],h=r['h']));rot=bool(frame.get('rotated'))
 if orig['w']==orig['h']==1:return None
 return dict(name=name,file=file,textureSha256=sha,x=r['x'],y=r['y'],width=r['w'],height=r['h'],packedWidth=r['h'] if rot else r['w'],packedHeight=r['w'] if rot else r['h'],rotated=rot,unrotateDegrees=-90 if rot else 0,trim=dict(x=tr['x'],y=tr['y'],width=tr['w'],height=tr['h']),original=dict(width=orig['w'],height=orig['h']))

assets={};inventory=[]
def asset(url):
 b=read(url);sha=hashbytes(b);ext=Path(url).suffix.lower();file=sha+ext
 kind=mimetypes.guess_type(url)[0] or 'application/octet-stream'
 assets[file]=dict(url=url,sha256=sha,bytes=len(b),type=kind)
 return file,b,dict(sha256=sha,bytes=len(b),kind=['mobile-source'],urls=[url])
mobile_frames={};mobile_files={}
for i in range(2):
 atlas_url=MOBILE+f'Images/Sprites/Images-{i}.json'
 jf,raw,jrecord=asset(atlas_url);atlas=json.loads(raw);mobile_files[jf]=jrecord
 tf,texture,record=asset(urljoin(atlas_url,atlas['meta']['image']));mobile_files[tf]=record
 for name,value in atlas['frames'].items():
  frame=normalized('@Mobile/'+name,value,tf,record['sha256'])
  if frame:mobile_frames['@Mobile/'+name]=frame

def standalone(url,name,files,frames):
 file,raw,record=asset(url);files[file]=record
 from io import BytesIO
 width,height=Image.open(BytesIO(raw)).size
 frame=normalized('@Mobile/'+name,dict(frame=dict(x=0,y=0,w=width,h=height)),file,record['sha256']);frames['@Mobile/'+name]=frame
 return file,width,height

background_file,bw,bh=standalone(MOBILE+'background-vertical.jpg','Background',mobile_files,mobile_frames)
for suffix in ['', 'Disabled','Hover']:
 standalone(MOBILE+'Images/Buttons/DoubleTakeVertical'+suffix+'.webp','Buttons/DoubleTakeVertical'+suffix,mobile_files,mobile_frames)

resources={}
def resource(path,b,type,compress=False):
 raw=gzip.compress(b,mtime=0) if compress else b
 resources[path]=dict(base64=base64.b64encode(raw).decode(),gzip=compress,bytes=len(b),sha256=hashbytes(b),type=type)
for file,path,type in [('reference-frame-r14.css','frame.css','text/css; charset=utf-8'),('reference-frame-r14.mjs','frame.mjs','application/javascript; charset=utf-8'),('smartsoft-mobile-r14.mjs','smartsoft-mobile.mjs','application/javascript; charset=utf-8')]:
 resource(path,(ROOT/file).read_bytes(),type,True)
resource('mobile-profiles-r14.mjs',(ROOT/'mobile-profiles-r14.mjs').read_bytes(),'application/javascript; charset=utf-8',True)
resource('reference-state.mjs',(ROOT/'reference-state-r14.mjs').read_bytes(),'application/javascript; charset=utf-8',True)
resource('hood-logo.png',read('https://static.ssg-public.com/cache/b15/GameLauncher/Content/Images/hood/new-hood-logo.png'),'image/png')
bindings={}
source_specs=json.loads((ROOT/'official-sources-r14.json').read_text())
targets=[('burningice_native','3d420e4fe5830b46'),('multihot100_native','5fddea498e1f0d39'),('habeshafortune5_native','7161514f85b0565e'),('multihotwildways_native','b930310f3d5338cd'),('multihot5wild_native','b930310f3d5338cd'),('multihot5superwilds_native','3d420e4fe5830b46'),('multihotdeluxe_native','fe6fe5c2996189a2'),('burningice10_native','cc0f22635df0e9c7'),('burningice40_native','cc0f22635df0e9c7')]
for gid,group in targets:
 namespace='20261110-accepted-controls-r12' if group=='cc0f22635df0e9c7' else '20261110-account-entry-r13'
 config=json.loads(read(ORIGIN+'/native-library/remaining20/'+namespace+'/'+group+'/games.json'))
 game=next(g for g in config if g['id']==gid);descriptor=game['referencePresentation'];base=read(ORIGIN+descriptor['manifestURL'])
 if hashbytes(base)!=descriptor['manifestSha256']:raise ValueError('Retained manifest hash changed')
 manifest=json.loads(base);legacy=gid.startswith('burningice');frames=dict(mobile_frames) if legacy else {};files=dict(mobile_files) if legacy else {}
 if not legacy:
  # Each source script switches its images directory to /Mobile. Desktop
  # atlases omit the portrait board frames, even when their names look alike.
  source_spec=source_specs[gid]
  if hashbytes(read(source_spec['source']))!=source_spec['sha256']:raise ValueError('Per-title public source changed')
  image_directory=manifest['atlases'][0]['source'].split('/Images/Sprites/')[0]+'/Mobile/Images/'
  for atlas_name in source_spec['mobileAtlasNames']:
   mobile_url=image_directory+atlas_name
   atlas_file,raw_atlas,atlas_record_new=asset(mobile_url);files[atlas_file]=atlas_record_new
   atlas=json.loads(raw_atlas)
   texture_file,texture,texture_record=asset(urljoin(mobile_url,atlas['meta']['image']));files[texture_file]=texture_record
   for name,value in atlas['frames'].items():
    frame=normalized('@Mobile/'+name,value,texture_file,texture_record['sha256'])
    if frame:frames['@Mobile/'+name]=frame
  if gid in ['multihot100_native','habeshafortune5_native','multihot5superwilds_native','multihotdeluxe_native']:
   # These four source scripts inherit the common Win component unchanged.
   # Wild/WildWays retain their explicit per-title overrides and are excluded.
   for event,filename in [('Win2','2'),('Win3','3'),('Win4','4'),('Win5','5'),('WinEnd','End')]:
    url='https://static.ssg-public.com/cache/b1/SlotsDemo/Content/Sound/Common/Win/'+filename+'.mp3'
    file,raw_sound,record=asset(url);files[file]=record
    manifest['audio']['Start/'+event+'.mp3']=dict(file=file,sha256=record['sha256'],sourceKey=event,sourceComponent='New/Components/win.js; common:true')
 suffix='-10' if '10_' in gid else '-40' if '40_' in gid else ''
 if legacy and suffix:
  for field,name in [('Logo','Start/Logo'),('LogoIce','Start/LogoIce'),('LineIcons','Start/LineIcons')]:standalone(MOBILE+'Images/Start/'+field+suffix+'.webp',name,files,frames)
 if legacy and suffix=='-40':
  for field in ['Column','ColumnActive']:standalone(MOBILE+'Images/Start/'+field+'-40.webp','Start/'+field,files,frames)
 manifest['frames'].update(frames);manifest['files'].update(files)
 if legacy:manifest['mobileBackground']=dict(file=background_file,width=bw,height=bh)
 manifest['mobileReference']=dict(source=manifest['source'],layout='Per-title public mobile source',revision='r14',scope='presentation only; original receipt model and release state retained')
 raw=json.dumps(manifest,separators=(',',':')).encode()
 resource('manifests/'+gid+'.json',raw,'application/json; charset=utf-8',True)
 bindings[gid]=dict(previousManifestSha256=descriptor['manifestSha256'],previousAssetBaseURL=descriptor['assetBaseURL'],manifestSha256=hashbytes(raw))
 inventory.append(dict(gameId=gid,previousManifestSha256=descriptor['manifestSha256'],manifestSha256=hashbytes(raw),newFrameCount=len(frames)))

# Metadata for queued titles is independent of financial launch availability.
queue=(ROOT/'official-queue-69.json').read_bytes()
resource('official-queue-69.json',queue,'application/json; charset=utf-8',True)
sources=dict(bindings=bindings,resources=resources,assets=assets)
(ROOT/'reference-sources-r14.mjs').write_text('// Generated by build-reference-r14.py. Original image bytes are mirrored with integrity verification.\nexport const REFERENCE_SOURCES='+json.dumps(sources,separators=(',',':'))+';\n')
player_sources=dict(bindings=bindings,resources={},assets={},remoteResources=list(resources),remoteAssets=list(assets),libraryPrefix='/v2/remaining20/reference-mobile-r14/')
(ROOT/'reference-player-sources-r14.mjs').write_text('// Existing EXPANSION100 service holds the public presentation bytes.\nexport const REFERENCE_SOURCES='+json.dumps(player_sources,separators=(',',':'))+';\n')
(ROOT/'reference-inventory-r14.json').write_text(json.dumps(dict(games=inventory,assets=assets),indent=2)+'\n')
print(json.dumps(dict(games=len(bindings),publicAssets=len(assets),generatedBytes=(ROOT/'reference-sources-r14.mjs').stat().st_size)))
