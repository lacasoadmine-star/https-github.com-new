import json,subprocess,time,hashlib,collections
from pathlib import Path
from datetime import datetime,timezone
repo=Path.cwd();report=repo/'reports/special74';tools=repo/'workers/superwin-player/special74/tools'
runs={'fresh74-20261113':74,'fresh74-retry-final-20261113':7,'fresh74-font-diagnostic-20261113':1}
last=None
while True:
 state={}
 for name,total in runs.items():
  try:state[name]=json.loads((report/'batch-observations'/name/'index.json').read_text())['totals']['finished']
  except (FileNotFoundError,ValueError):state[name]=0
 if state!=last:print(json.dumps({'waitingForFreshReferences':state}),flush=True);last=state
 if all(state[n]==t for n,t in runs.items()):break
 time.sleep(10)
stages=[]
for name,command in [
 ('download',['python',str(tools/'fetch-all-media.py'),'--workers','16','--checkpoint-every','1000']),
 ('svg',['node',str(tools/'verify-svg.cjs')]),
 ('integrity',['python',str(tools/'verify-media-integrity.py')])]:
 result=subprocess.run(command,cwd=repo);stages.append({'stage':name,'exitCode':result.returncode})
 if result.returncode not in ((0,1) if name=='download' else (0,)):break
manifest=json.loads((report/'all74-media-manifest.json').read_text());status=json.loads((report/'all74-media-status.json').read_text());integrity=json.loads((report/'all74-media-integrity.json').read_text())
original=json.loads((report/'batch-observations/fresh74-20261113/index.json').read_text());retry=json.loads((report/'batch-observations/fresh74-retry-final-20261113/index.json').read_text());rows={e['id']:dict(e,run='fresh74-20261113')for e in original['entries']};rows.update({e['id']:dict(e,run='fresh74-retry-final-20261113')for e in retry['entries']})
summary={'updatedAt':datetime.now(timezone.utc).isoformat(),'scope':'Fresh public-reference downloads for the existing selected 74 games; not complete gameplay acceptance or live deployment','stages':stages,'selectedGames':74,'officialPagesDownloaded':74,'freshOfficialCatalogueLinksMatched':74,'coversDownloaded':74,'sharedFontReferencesDownloaded':6,'media':{k:status[k]for k in ['verifiedMedia','verifiedBytes','failedMedia','pendingMedia','gamesWithVerifiedMedia','gamesWithAllObservedMedia']},'mediaTypes':dict(collections.Counter(a['mime']for a in manifest['assets'])),'unavailableReasons':dict(collections.Counter(a['error']for a in manifest['failures'])),'unverifiedPins':len(manifest['unverifiedPins']),'integrity':{k:integrity[k]for k in ['checkedFiles','verifiedFiles','failedFiles','manifestSha256']},'freshDemoPass':{'attempted':len(rows),'withMedia':sum(bool(e.get('media'))for e in rows.values()),'withConfirmedRounds':sum(bool(e.get('confirmedRoundIds'))for e in rows.values()),'statuses':dict(collections.Counter(e['status']for e in rows.values())),'recoveredToolingFailures':len(retry['entries']),'allFeaturesVerified':False},'applicationSourceChanged':False,'productionChanged':False,'deploymentPerformed':False,'acceptedFollowOnScope':'Retain all existing live games, accounts, wallet, backend and APIs. Add new games later using independently authored server-side math; downloads have priority per latest user instruction.','entries':[{'id':e['id'],'title':e['selectedName'],'run':e['run'],'status':e['status'],'observedMedia':len(e.get('media',[])),'confirmedRounds':len(e.get('confirmedRoundIds',[])),'allFeaturesVerified':False}for e in rows.values()]}
(report/'fresh-download-summary-20261113.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items()if k!='entries'}),flush=True)
