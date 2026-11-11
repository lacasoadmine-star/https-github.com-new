#!/usr/bin/env python3
"""Audit only this fresh run. A clicked control is not a confirmed round."""
import json,hashlib,re
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
def read(p,default):
 try:return json.loads(p.read_text())
 except (FileNotFoundError,json.JSONDecodeError):return default
catalogue=read(ROOT/'catalogues/smartsoft-games.json',{})
records=[]
for game in catalogue.get('games',[]):
 d=ROOT/'games'/game['id'];m=read(d/'09-network/capture-manifest.json',{})
 native=read(d/'10-layout-mobile/batch10-control-session.json',{})
 if not m and native:
  m={**native,'status':'blocked_by_provider' if native.get('provider_blocked') else 'native_audited','play_clicked':any(x.get('native_spin_clicked') for x in native.get('native_rounds',[])),'round_state_change_observed':any(x.get('account_state_changed') for x in native.get('native_rounds',[]))}

 shots=[];balances=[]
 for p in sorted((d/'09-network').glob('state-*.json')):
  state=read(p,{});frames=state.get('frames',[]);path=ROOT/state.get('path','missing')
  if not path.is_file():continue
  for frame in frames:
   match=re.search(r'BALANCE\s*([0-9][0-9,.]*)\s*(?:DMO|DEMO)',frame.get('text',''),re.I)
   if match:balances.append({'label':state.get('label'),'amount':match.group(1).replace(',','')})
  text=' '.join(f.get('text','') for f in frames).lower()
  blocked=any(v in text for v in ['you can create up to','access denied','your session has expired','game is not available'])
  ready=not blocked and any(f.get('canvas') for f in frames) and not any(f.get('visibleLoaders') for f in frames)
  shots.append({'path':str(path.relative_to(ROOT)),'label':state.get('label'),'canvas_without_reported_loader':ready,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 changed=bool(m.get('round_state_change_observed') or m.get('play_clicked') and len({x['amount'] for x in balances})>1)
 assets=m.get('assets',[]);missing=[]
 if not m:missing.append('Official browser session still running or pending')
 if sum(s['canvas_without_reported_loader'] for s in shots)<10:missing.append('Ten verified rendered screenshots not yet available')
 if not changed:missing.append('Native demo round state change not confirmed')
 if not any(a.get('group')=='03-sound' for a in assets):missing.append('Sound resources not yet captured')
 if not (d/'04-video-animation/demo-session.webm').is_file():missing.append('Session video not yet finalized')
 if m.get('local_render_fps_cap') is not None:missing.append('Timing needs another unmodified-renderer observation')
 r={'game':game,'fresh_source_only':True,'previous_user_media_used':False,'previous_engine_used':False,'session_status':m.get('status','pending'),'screenshots':shots,'play_clicked':bool(m.get('play_clicked')),'round_changed':changed,'visible_demo_balances':balances,'final_settlement_confirmed':False,'assets_by_group':{group:sum(a.get('group')==group for a in assets) for group in ['03-sound','04-video-animation','06-artwork','11-fonts','12-client-code']},'control_actions':m.get('actions',[]),'missing':missing,'construction_complete':False,'provider_server_source_obtained':False}
 target=d/'13-live-build-specification/fresh-evidence.json';target.parent.mkdir(exist_ok=True);target.write_text(json.dumps(r,indent=2))
 records.append({'id':game['id'],'status':r['session_status'],'screenshots':len(shots),'valid_screenshots':sum(s['canvas_without_reported_loader'] for s in shots),'round_changed':r['round_changed'],'missing':missing})
summary={'at':datetime.now(timezone.utc).isoformat(),'games':records,'counts':{'official_pages':len(records),'session_reports_saved':sum(r['status']!='pending' for r in records),'screenshots':sum(r['screenshots'] for r in records),'ten_rendered_screenshots':sum(r['valid_screenshots']>=10 for r in records),'games_with_observed_round_state_change':sum(r['round_changed'] for r in records)},'all_74_complete':all(not r['missing'] for r in records) and len(records)==74}
(ROOT/'reports/fresh-progress.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary['counts']))
