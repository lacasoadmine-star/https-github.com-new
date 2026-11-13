"""Compile captured region-only Spine data; never copy provider executable code."""
import json, hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
base=root/'assets/observed/static.ssg-public.com/cache/b1/SlotsDemo/Content/Images/MultiHot10/Mobile/Spine/Logo'
atlas=base/'multi hot 100 logo.atlas.txt';source=base/'multi hot 100 logo.json'
d=json.loads(source.read_text());regions={};name=None
for line in atlas.read_text().splitlines():
 if not line.strip():continue
 if not line.startswith(' ') and ':' not in line:
  name=line;regions[name]={}
 elif line.startswith(' ') and name:
  key,value=line.strip().split(':',1);regions[name][key]=value.strip()
frames={}
for name,r in regions.items():
 if not all(k in r for k in ['xy','size','orig','offset','rotate']):continue
 pair=lambda k:[int(n.strip())for n in r[k].split(',')]
 frames[name]={'xy':pair('xy'),'size':pair('size'),'orig':pair('orig'),'offset':pair('offset'),'rotated':r['rotate']=='true'}
a=d['animations']['animation'];attachments=d['skins'][0]['attachments'];tracks=[]
for slot in d['slots']:
 bone=next(b for b in d['bones'] if b['name']==slot['bone']);translation=a.get('bones',{}).get(bone['name'],{}).get('translate',[{}])
 if len(translation)!=1:raise ValueError('Animated bone needs a different renderer')
 track=a.get('slots',{}).get(slot['name'],{});timeline=track.get('attachment',[{'name':slot['attachment']}]);objects=attachments[slot['name']]
 for event in timeline:
  if event['name'] not in frames or objects[event['name']].get('type','region')!='region':raise ValueError('Unsupported attachment')
 tracks.append({'blend':slot.get('blend','normal'),'translation':translation[0],'attachments':objects,'timeline':timeline,'alpha':track.get('color',[])})
result={'frames':frames,'tracks':tracks,'duration':max(e.get('time',0)for t in tracks for e in t['timeline']),'evidence':[{'path':str(p.relative_to(root.parents[2])),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in [source,atlas,base/'multi hot 100 logo.png']]}
(root/'src/multihot10-logo.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
print('Compiled original logo tracks',len(tracks),'regions',len(frames))
