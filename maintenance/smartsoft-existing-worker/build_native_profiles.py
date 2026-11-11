#!/usr/bin/env python3
"""Join fresh artwork to the existing versioned account models, by meaning.

This prepares actual game components. It creates no site, account or wager.
"""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
GAME_IDS={
 'multihot100_native':'multi-hot-100',
 'habeshafortune5_native':'hab',
 'multihotwildways_native':'multi-hot-wild-ways',
 'multihot5wild_native':'multi-hot-5-wild',
 'multihot5superwilds_native':'multi-hot-5-super-wilds',
 'multihotdeluxe_native':'multi-hot-5-deluxe',
 'burningice_native':'burning-ice-41',
 'burningice10_native':'blazing-hot-10',
 'burningice40_native':'burning-ice-40',
}

def sha(data):return hashlib.sha256(data).hexdigest()
def read(path):return json.loads(path.read_text())
def write(path,data):
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

def build():
 mappings=read(ROOT/'reports/native9-symbol-map.json')
 policy=read(ROOT/'tests/fixtures/operator-policy-r16.json')
 report=[]
 for backend_id,official_id in GAME_IDS.items():
  source=ROOT/'games/batch10'/official_id
  game=read(ROOT/'reports/native9'/f'{backend_id}-game.json')
  assert game['id']==backend_id and game['version']==policy['versions'][backend_id]
  game={**game,'published':True,'launchable':True}
  game['symbols']=[{k:v for k,v in symbol.items()if k!='mark'}for symbol in game['symbols']]
  assets=read(source/'asset-map.json')
  provenance=read(source/'asset-provenance.json')
  assert provenance['old_live_assets_used']is False
  assert provenance['screenshots_as_game_surface']is False
  symbol_map=mappings[backend_id]
  assert symbol_map['officialId']==official_id
  assert set(symbol_map['map'])=={str(symbol['id'])for symbol in game['symbols']}
  assets['symbols']=symbol_map['map']
  files={v for group in assets.values()for v in group.values()if isinstance(v,str)}
  files.update(v for group in assets.values()for values in group.values()if isinstance(values,list)for v in values)
  expected={a['output']:a['sha256']for a in provenance['assets']if 'sha256'in a}
  hashes={}
  for name in sorted(files):
   assert '/'not in name and name in expected, 'Unreviewed game resource: '+name
   actual=sha((source/'assets'/name).read_bytes())
   assert actual==expected[name], 'Fresh resource changed: '+name
   hashes[name]=actual
  for symbol in symbol_map['symbols'].values():
   assert hashes[symbol['asset']]==symbol['sha256'], 'Symbol mapping provenance changed'
  regular=[str(s['id'])for s in game['symbols']if not any(word in s['label'].lower()for word in ['wild','scatter','pot','dollar'])]
  assert regular
  preview=[[regular[(column*3+row)%len(regular)]for row in range(game['rows'])]for column in range(game['columns'])]
  layout='burning'if backend_id.startswith('burningice')else'left-wheel'if game['columns']==3 else'top-wheel'
  revision=sha(json.dumps({'assets':hashes,'map':assets['symbols'],'version':game['version']},sort_keys=True).encode())[:20]
  profile={'schema':1,'backendId':backend_id,'officialId':official_id,'name':game['name'],
   'columns':game['columns'],'rows':game['rows'],'paylines':game['paylines'],'layout':layout,
   'titleSuffix':{'burningice10_native':'10','burningice40_native':'40'}.get(backend_id,''),
   'assetBase':'/independent74/native/'+official_id+'/assets/','assetRevision':revision,
   'assets':assets,'assetHashes':hashes,'game':game,'initialGrid':preview,
   'initialGridIsOutcome':False,
   'reference':{'officialUrl':'https://www.smartsoftgaming.com/games/'+official_id,
    'freshOfficialArtwork':True,'userMediaUsed':False,'providerPrivateMathReproduced':False},
   'wheel':{'values':[1,2,3,4,5],'arcSequence':[2,4,2,5,1,3,5,2,3,4,1,3,5]},
  }
  write(source/'profile.json',profile)
  report.append({'backendId':backend_id,'officialId':official_id,'files':len(hashes),
   'symbols':len(assets['symbols']),'version':game['version'],'layout':layout,
   'profileSha256':sha((source/'profile.json').read_bytes()),'freshAssetRevision':revision})
 write(ROOT/'reports/native-profile-build.json',{'games':report,'financialModelsChanged':False,
  'acceptedMultiHot5AndFoxyHot20Changed':False,'networkRequests':0,'databaseWrites':0})
 print(json.dumps({'profiles':len(report),'verifiedMappedSymbols':sum(x['symbols']for x in report),
  'financialModelsChanged':False}))

if __name__=='__main__':build()
