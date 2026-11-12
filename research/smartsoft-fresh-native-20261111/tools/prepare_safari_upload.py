"""Prepare additive private resource uploads; no external writes here."""
import importlib.util,json,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];old=Path('/workspace/superwin-existing-integration')
spec=importlib.util.spec_from_file_location('resources',old/'prepare_native_resource_upload.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
staging=ROOT/'.private-upload-source';shared=staging/'shared';shared.mkdir(parents=True,exist_ok=True)
for name in ['native-scene.mjs','scene-bootstrap.mjs','scene-account.mjs','safari-account.mjs','safari-account-client.mjs','scene.css']:
 shutil.copy2(ROOT/'native-machines/shared'/name,shared/name)
shutil.copy2(ROOT/'native-machines/shared/index.html',shared/'scene-v2.html');shutil.copytree(ROOT/'native-machines/shared/assets',shared/'assets',dirs_exist_ok=True)
output=ROOT/'.private-upload';batches=output/'batches';batches.mkdir(parents=True,exist_ok=True);index=[]
for game,directory in [('shared',shared),('scene-v2-safari-simba-2',ROOT/'native-machines/safari-simba-2')]:
 print(json.dumps(mod.prepare(game,directory,output)))
 manifest=json.loads((output/game/'manifest.json').read_text());queries=[]
 schema=[{'sql':'CREATE TABLE IF NOT EXISTS native_game_files(path TEXT PRIMARY KEY,version TEXT NOT NULL,bytes INTEGER NOT NULL,chunks INTEGER NOT NULL,sha256 TEXT NOT NULL)','params':[]},{'sql':'CREATE TABLE IF NOT EXISTS native_game_chunks(path TEXT NOT NULL,version TEXT NOT NULL,part INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(path,version,part)) WITHOUT ROWID','params':[]}]
 queries.extend(schema)
 def flush():
  if not queries:return
  name=game+'-'+str(len(index)).zfill(3)+'.json';body={'durable_object_name':manifest['instance'],'jurisdiction':'none','queries':queries[:]};path=batches/name;path.write_text(json.dumps(body,separators=(',',':')));path.chmod(0o600);index.append({'name':name,'bytes':path.stat().st_size,'queries':len(queries)});queries.clear()
 for f in manifest['files']:
  for name in f['chunks']+[f['commit']]:
   body=json.loads((output/game/name).read_text())
   for query in body['queries']:
    if len(queries)>=18 or len(json.dumps(queries,separators=(',',':')))+len(json.dumps(query,separators=(',',':')))>2100000:flush()
    queries.append(query)
 flush()
(batches/'index.json').write_text(json.dumps(index));print(json.dumps({'batches':len(index),'bytes':sum(x['bytes']for x in index),'queries':sum(x['queries']for x in index)}))
