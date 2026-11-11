#!/usr/bin/env python3
"""Generate evidence-backed, per-game construction notes. This does not build games."""
import hashlib
import json
import re
from collections import Counter
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import parse_qs,urlsplit

ROOT=Path(__file__).resolve().parents[1]
def read_json(path,fallback):
 try:return json.loads(path.read_text())
 except (FileNotFoundError,json.JSONDecodeError):return fallback
def digest(path):
 h=hashlib.sha256()
 with path.open('rb')as handle:
  while data:=handle.read(1024*1024):h.update(data)
 return h.hexdigest()
def write_json(path,value):
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')

def build(game,backend_by_url):
 directory=ROOT/'games'/game['id'];capture=read_json(directory/'09-network/capture-manifest.json',{})
 captures=[];controls={};configurations=[];observed_text=[]
 for path in sorted((directory/'09-network').glob('state-*.json')):
  record=read_json(path,{})
  source=ROOT/record.get('path','missing')
  frames=record.get('frames',[])
  visible_loader=any(frame.get('visibleLoaders')for frame in frames)
  has_canvas=any(frame.get('canvas')for frame in frames)
  if source.is_file():captures.append({'label':record.get('label'),'path':str(source.relative_to(ROOT)),
    'sha256':digest(source),'has_game_canvas':has_canvas,'visible_loader_reported':visible_loader,'captured_at':record.get('captured_at')})
  for frame in frames:
   config=frame.get('configuration',{})
   if config and config not in configurations:configurations.append(config)
   if frame.get('text')and frame['text']not in observed_text:observed_text.append(frame['text'])
   for control in frame.get('dom',[]):
    key=('dom',control.get('tag'),control.get('id'),control.get('classes'),control.get('text'))
    controls[key]={'kind':'dom',**control}
   for control in frame.get('pixi',[]):
    key=('canvas',control.get('name'),control.get('status'))
    controls[key]={'kind':'canvas',**control}
 colours=Counter();fonts=Counter();sprites=[];animations=[];assets=[]
 for group in ['03-sound','04-video-animation','06-artwork','11-fonts','12-client-code']:
  for path in sorted((directory/group).glob('*')):
   if not path.is_file():continue
   if path.suffix.lower()in['.css','.js']and path.stat().st_size<3*1024*1024:
    text=path.read_text(errors='replace')
    colours.update(c.lower()for c in re.findall(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b',text))
    fonts.update(v.strip().strip('"\'')for v in re.findall(r'font[Ff]amily\s*[:=]\s*["\']([^"\']+)',text))
   if path.suffix.lower()=='.json'and path.stat().st_size<12*1024*1024:
    value=read_json(path,{})
    if isinstance(value,dict):
     if isinstance(value.get('frames'),dict):sprites.append({'path':str(path.relative_to(ROOT)),'frame_names':list(value['frames'])})
     if isinstance(value.get('animations'),dict):animations.append({'path':str(path.relative_to(ROOT)),'animation_names':list(value['animations'])})
   if group!='12-client-code':assets.append({'group':group,'path':str(path.relative_to(ROOT)),'bytes':path.stat().st_size})
 actions=read_json(directory/'07-buttons/actions.json',[])
 actual_clicks=[a for a in actions if a.get('outcome')=='clicked']
 usable=[c for c in captures if c['has_game_canvas']and not c['visible_loader_reported']]
 audio=[a for a in assets if a['group']=='03-sound'];video=directory/'04-video-animation/demo-session.webm'
 backend=backend_by_url.get(game['official_url'],{})
 missing=[]
 if len(usable)<10:missing.append('Fewer than 10 game-canvas screenshots without a reported loader')
 if not capture.get('play_clicked'):missing.append('Native play action has not yet been successfully recorded')
 if not capture.get('round_state_change_observed'):missing.append('A changed round/account state still needs confirmation')
 if not audio:missing.append('No genuine audio files captured yet')
 if not video.exists()or video.stat().st_size<3000:missing.append('No usable original gameplay recording saved yet')
 if capture.get('status')in['blocked_by_provider','partial_timeout','unverified_load']:missing.append('Capture status requires another official-demo visit: '+capture['status'])
 record={'schema':1,'generated_at':datetime.now(timezone.utc).isoformat(),'game':game,
  'official_launcher_game_name':parse_qs(urlsplit(game['demo_url']).query).get('GameName',[None])[0],
  'source_policy':'Fresh official public sources from this task. User images and previous machines are not game-reference assets.',
  'integration':{'target_worker':'superwin-player','origin':'https://superwin-player.apdiy61.workers.dev',
   'existing_backend_registration':backend.get('id'),'current_build_status':backend.get('buildStatus'),
   'instruction':'Implement the same existing unfinished game route. Do not create a reference website, dashboard, duplicate card, static-image game or public archive link.'},
  'evidence':{'capture_status':capture.get('status','not_visited'),'captured_screenshots':len(captures),
   'canvas_screenshots_without_reported_loader':len(usable),'native_play_clicked':capture.get('play_clicked',False),
   'round_state_change_observed':capture.get('round_state_change_observed',False),'actual_native_click_count':len(actual_clicks),
   'audio_files':len(audio),'video_saved':video.exists(),'video_contains_audio':False},
  'screenshots':captures,'controls':list(controls.values()),'observed_actions':actual_clicks,
  'observed_configuration':configurations,'visible_text_and_rules':observed_text,
  'observed_css_colours':colours.most_common(40),'observed_font_names':fonts.most_common(30),
  'sprite_atlases':sprites,'skeletal_animation_names':animations,'media_files':assets,
  'unresolved':missing,'construction_complete':False,'provider_server_source_obtained':False,
  'implementation_requirements':[
   'Use this title’s own symbols, layout, transitions and genuine served sound files.',
   'Implement actual state-driven reels/animations and native interactive controls; a video loop or screenshot is not a game.',
   'Each control must open its observed panel or execute its observed operation, including rules, bet, sound, history, autoplay and result response.',
   'Use the existing authenticated account, exact minor-unit arithmetic, atomic settlement, idempotency and round recovery.',
   'Do not enable an unfinished model or claim proprietary provider math was recovered from visual references.',
   'Treat the working NEW MultiHot5 and FoxyHot20 as integration/quality examples; keep their working routes intact.'
  ]}
 target=directory/'13-live-build-specification/game-specification.json';write_json(target,record)
 return {'id':game['id'],'name':game['name'],**record['evidence'],'unresolved':missing,'specification':str(target.relative_to(ROOT))}

def main():
 catalogue=read_json(ROOT/'catalogues/smartsoft-games.json',{'games':[]})
 backend=read_json(ROOT.parent/'superwin-existing-integration/state/nine-games.json',{'games':[]})
 by_url={g.get('observedSource'):g for g in backend['games']if g.get('freshRegistration')}
 games=[build(game,by_url)for game in catalogue['games']]
 report={'generated_at':datetime.now(timezone.utc).isoformat(),'requested_games':74,'games':games,
  'counts':{'official_pages':len(games),'demo_sessions_recorded':sum(g['capture_status']!='not_visited'for g in games),
   'screenshots':sum(g['captured_screenshots']for g in games),'games_with_ten_canvas_screenshots':sum(g['canvas_screenshots_without_reported_loader']>=10 for g in games),
   'native_play_recorded':sum(g['native_play_clicked']for g in games),'games_with_audio':sum(g['audio_files']>0 for g in games),
   'games_with_video':sum(g['video_saved']for g in games)},
  'status':'collection_in_progress'if any(g['unresolved']for g in games)else'collection_evidence_complete',
  'public_reference_dashboard':False,'game_construction_complete':False}
 write_json(ROOT/'reports/construction-evidence.json',report)
 print(json.dumps(report['counts']))

if __name__=='__main__':main()
