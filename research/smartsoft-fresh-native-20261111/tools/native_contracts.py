#!/usr/bin/env python3
"""Prepare per-title observed presentation contracts, never invented game maths."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(p,default):
 try:return json.loads(p.read_text())
 except (OSError,json.JSONDecodeError):return default
def mapping(value):
 return value if isinstance(value,dict) else {str(i):v for i,v in enumerate(value)} if isinstance(value,list) else {}
results=[]
for game in read(ROOT/'catalogues/smartsoft-games.json',{}).get('games',[]):
 d=ROOT/'games'/game['id'];config=read(d/'05-reels-system/public-client-configuration.json',{})
 frames=config.get('frames',[])
 if not frames:continue
 m=read(d/'09-network/capture-manifest.json',{})
 sources=[{k:a.get(k) for k in ['source_url','path','sha256','bytes','group']} for a in m.get('assets',[])]
 contracts=[]
 for f in frames:
  slot=f.get('slot',{});boxes=slot.get('boxes')or{};resources=f.get('resources',{})
  aliases={group:{name:{k:value.get(k) for k in ['url','sprite','spriteName','load'] if k in value} for name,value in mapping(resources.get(group)).items() if isinstance(value,dict)} for group in ['images','sounds','spines','sprites']}
  contracts.append({'reels':{k:boxes.get(k) for k in ['row','column','width','height','mask','columnSort','blurRow']},'declared_symbol_presentations':boxes.get('settings',[]),'declared_spin_tweens':boxes.get('spin'),'timing_note':'These are public tween configuration values, not measured end-to-end spin latency. Server response timing and native transitions must be verified separately.','native_controls':slot.get('buttons'),'native_lines_presentation':slot.get('lines'),'native_canvas':slot.get('canvas'),'resource_roots':resources.get('url'),'resource_aliases':aliases,'observed_instant_config':f.get('instantConfig')})
 out={'schema':1,'game':game,'source':'Only fresh native public demo observations from this run','presentation_contracts':contracts,'downloaded_resources':sources,'native_actions':m.get('actions',[]),'native_scene':'05-reels-system/fresh-native-scene.json' if (d/'05-reels-system/fresh-native-scene.json').exists() else None,'private_provider_math_available':False,'construction_complete':False,'prohibitions':['Do not reuse the rejected renderers or previous user media.','Do not promote framework-declared features to verified gameplay without an observed response.','Do not use screenshots or a video loop as the playable machine.','Do not invent a confirmed outcome or account balance.']}
 (d/'13-live-build-specification/native-presentation-contract.json').write_text(json.dumps(out,indent=2))
 results.append({'id':game['id'],'native_frames':len(contracts),'downloaded_resources':len(sources)})
(ROOT/'reports/native-contracts.json').write_text(json.dumps(results,indent=2));print(json.dumps({'game_contracts':len(results),'private_server_math_obtained':False}))
