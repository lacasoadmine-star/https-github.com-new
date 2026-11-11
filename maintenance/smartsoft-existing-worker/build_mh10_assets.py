#!/usr/bin/env python3
"""Unpack genuine fresh official texture atlases for the independently coded game."""
import hashlib,json,re,shutil
from pathlib import Path
from urllib.parse import unquote,urljoin
from urllib.request import Request,urlopen
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parent
SOURCE=Path('/workspace/official-game-research-2026-11-11/games/multi-hot-10-2')
OUT=ROOT/'games/multihot10/assets'
OUT.mkdir(parents=True,exist_ok=True)
records=[];atlases=[]
for file in sorted((SOURCE/'04-video-animation').glob('*.json')):
 try:
  data=json.loads(file.read_text())
  if not isinstance(data.get('frames'),dict):continue
  image=data.get('meta',{}).get('image')
  texture=next((p for p in (SOURCE/'06-artwork').glob('*')if re.sub(r'^[0-9a-f]{12}-','',p.name)==image),None)
  # Match the atlas's URL hash prefix where desktop and mobile texture names coincide.
  for manifest in [SOURCE/'09-network/capture-manifest.json',SOURCE/'10-layout-mobile/native-phone-session.json']:
   if not manifest.exists():continue
   resources=json.loads(manifest.read_text()).get('assets',[])
   own=next((a for a in resources if Path(a['path']).name==file.name),None)
   if own:
    target=urljoin(own['source_url'],image)
    texture=next((SOURCE.parents[1]/a['path']for a in resources if a['source_url']==target),texture)
    mobile='/Mobile/'in own['source_url'];break
  else:mobile=False
  if texture and texture.exists():atlases.append((file,data,texture,mobile))
 except Exception:continue

def frame(name,output,mobile=False,maximum=None):
 options=[a for a in atlases if name in a[1]['frames']]
 options.sort(key=lambda a:a[3]!=mobile)
 if not options:raise ValueError('Missing genuine frame '+name)
 atlas,data,texture,is_mobile=options[0];entry=data['frames'][name];f=entry['frame']
 with Image.open(texture)as sheet:
  if entry.get('rotated'):
   image=sheet.crop((f['x'],f['y'],f['x']+f['h'],f['y']+f['w'])).transpose(Image.Transpose.ROTATE_90)
  else:image=sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
  image=image.convert('RGBA')
  if maximum:image.thumbnail((maximum,maximum),Image.Resampling.LANCZOS)
  image.save(OUT/output,'WEBP',lossless=True,method=6)
 records.append({'output':output,'source_atlas':str(atlas),'source_texture':str(texture),'source_frame':name,'frame':entry,'mobile_atlas':is_mobile,'sha256':hashlib.sha256((OUT/output).read_bytes()).hexdigest()})

symbols={'seven':0,'bell':1,'grape':2,'watermelon':3,'cherry':4,'orange':5,'plum':6,'lemon':7}
for name,index in symbols.items():frame('Box/'+str(index),'symbol-'+name+'.webp')
for source,target in [('Box/Background','reel-frame'),('Buttons/Spin','spin'),('Buttons/SpinStop','spin-stop'),('Buttons/AutoPlay','autoplay'),('Buttons/AutoPlayStop','autoplay-stop'),('Buttons/Bet','bet'),('Buttons/Double','gamble'),('Buttons/DoubleTake','collect'),('Buttons/QuickPlay','turbo'),('Multiplier/Background','wheel-background'),('Multiplier/Numbers','wheel-numbers'),('Multiplier/Light','wheel-light')]:
 try:frame(source,target+'.webp',mobile=True,maximum=1200)
 except ValueError:pass
for i in range(1,37):
 try:frame('BoxWin/'+str(i),f'win-{i:02d}.webp',maximum=240)
 except ValueError:pass
background=max((p for p in (SOURCE/'06-artwork').glob('*background.png')),key=lambda p:p.stat().st_size)
with Image.open(background)as image:image.save(OUT/'background.webp','WEBP',lossless=True,method=6)
records.append({'output':'background.webp','source_texture':str(background),'sha256':hashlib.sha256((OUT/'background.webp').read_bytes()).hexdigest()})

# The public client explicitly declares these sound resources. No game API is called.
script=next((SOURCE/'12-client-code').glob('*-MultiHot10.js')).read_text()
block=script[script.index('game.sounds ='):script.index('//#endregion',script.index('game.sounds ='))]
sound_names={}
for role,path in re.findall(r'^\s*([A-Za-z0-9_]+):\s*\{\s*url:\s*[\'"]([^\'"]+\.mp3)',block,re.M):
 url='https://static.ssg-public.com/cache/b1/SlotsDemo/Content/Sound/MultiHot10/'+path.replace(' ','%20')
 basename=hashlib.sha256(url.encode()).hexdigest()[:12]+'-'+path.rsplit('/',1)[-1].replace(' ','_')
 original=SOURCE/'03-sound'/basename
 try:
  if not original.exists():
   with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25)as response:original.write_bytes(response.read(12*1024*1024))
  output='sound-'+re.sub(r'[^a-z0-9]+','-',role.lower())+'.mp3';shutil.copyfile(original,OUT/output)
  sound_names[role]=output
  records.append({'output':output,'source_url':url,'source_texture':str(original),'sha256':hashlib.sha256(original.read_bytes()).hexdigest()})
 except Exception as exc:records.append({'sound_role':role,'source_url':url,'missing':str(exc)[:180]})
(OUT.parent/'asset-provenance.json').write_text(json.dumps({'source':'Fresh official Multi Hot 10 demo','independent_game_code':True,'symbols':symbols,'sounds':sound_names,'assets':records},indent=2)+'\n')
canvas=Image.new('RGB',(800,280),'#05261b');draw=ImageDraw.Draw(canvas)
for index,name in enumerate(symbols):
 image=Image.open(OUT/('symbol-'+name+'.webp'));image.thumbnail((88,120));canvas.paste(image,(index*100+(100-image.width)//2,25),image);draw.text((index*100+5,155),name,fill='white')
canvas.save(OUT.parent/'symbol-inventory.png')
print(json.dumps({'assets':len(list(OUT.iterdir())),'bytes':sum(p.stat().st_size for p in OUT.iterdir()),'sound_roles':len(sound_names)}))
