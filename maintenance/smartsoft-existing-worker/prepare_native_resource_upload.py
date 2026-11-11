#!/usr/bin/env python3
"""Prepare private Cloudflare SQL requests. This command never contacts a service."""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path

CHUNK=1048576
GAMES={'shared','multi-hot-10-2','multi-hot-20','multi-hot-40','multi-hot-100','multi-hot-5-deluxe','burning-ice-41','blazing-hot-10','burning-ice-40','hab','hot-samba','boca-jamba-10','multi-hot-wild-ways','multi-hot-5-wild','multi-hot-5-super-wilds'}
ALLOWED=re.compile(r'^(?:index\.html|[a-z0-9-]+\.mjs|style\.css|profile\.json|assets/[a-z0-9-]+\.(?:webp|png|mp3|ogg|woff2))$')

def write(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,separators=(',',':'))+'\n')
    path.chmod(0o600)

def prepare(game,directory,output):
    if game not in GAMES:raise ValueError('Game is outside the reviewed first-batch allowlist')
    output=output/game;output.mkdir(parents=True,exist_ok=True)
    instance='native-game-resources:'+game+':v1'
    envelope={'durable_object_name':instance,'jurisdiction':'none'}
    files=[]
    for source in sorted(directory.rglob('*')):
        if not source.is_file():continue
        relative=source.relative_to(directory).as_posix()
        if not ALLOWED.fullmatch(relative):continue
        if source.is_symlink():raise ValueError('Resource must not be a symlink')
        data=source.read_bytes()
        if not 0<len(data)<=25*1024*1024:raise ValueError('Resource size out of range: '+relative)
        path='/independent74/native/'+game+'/'+relative
        version=hashlib.sha256(data).hexdigest()
        request_prefix=hashlib.sha256(path.encode()).hexdigest()[:16]+'-'+version
        total=(len(data)+CHUNK-1)//CHUNK
        requests=[]
        # Each chunk is one bound string, safely below the connector's4MiB limit.
        # The API accepts string/number/null params, not byte arrays. This is
        # deliberately base64 TEXT, never a misleading CAST-to-BLOB workaround.
        for part,start in enumerate(range(0,len(data),CHUNK)):
            body={**envelope,'queries':[{'sql':'INSERT INTO native_game_chunks(path,version,part,data) VALUES(?,?,?,?) ON CONFLICT(path,version,part) DO UPDATE SET data=excluded.data',
                  'params':[path,version,part,base64.b64encode(data[start:start+CHUNK]).decode()]}]}
            name=request_prefix+'-'+str(part)+'.json';write(output/name,body);requests.append(name)
        # The manifest pointer changes only after a complete, contiguous version
        # is present. Prior versions remain readable throughout the upload.
        commit={**envelope,'queries':[{'sql':'''INSERT INTO native_game_files(path,version,bytes,chunks,sha256)
SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM native_game_chunks WHERE path=? AND version=? AND part>=0 AND part<?)=?
ON CONFLICT(path) DO UPDATE SET version=excluded.version,bytes=excluded.bytes,chunks=excluded.chunks,sha256=excluded.sha256''',
                 'params':[path,version,len(data),total,version,path,version,total,total]},
                {'sql':'SELECT path,version,bytes,chunks,sha256 FROM native_game_files WHERE path=?','params':[path]}]}
        name=request_prefix+'-commit.json';write(output/name,commit)
        files.append({'path':path,'source':str(source),'bytes':len(data),'sha256':version,'chunks':requests,'commit':name})
    if not files:raise ValueError('No reviewed game resources found')
    manifest={'game':game,'class_name':'NativeGameResources','binding':'NATIVE_GAME_RESOURCES','instance':instance,
              'namespace_id':'RESOLVE_NEW_NATIVE_GAME_RESOURCES_NAMESPACE_AFTER_REVIEWED_VERSION_DEPLOY',
              'private_api':'/accounts/{account_id}/workers/durable_objects/namespaces/{namespace_id}/query/v2',
              'files':files,'network_requests_performed':0,'database_writes_performed':0}
    write(output/'manifest.json',manifest)
    return {'game':game,'files':len(files),'bytes':sum(f['bytes']for f in files),'sql_upload_chunks':sum(len(f['chunks'])for f in files),
            'directory':str(output),'network_requests_performed':0,'database_writes_performed':0}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--game',required=True,choices=sorted(GAMES))
    parser.add_argument('--directory',required=True,type=Path)
    parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parent/'.private-native-game-upload')
    args=parser.parse_args()
    print(json.dumps(prepare(args.game,args.directory.resolve(),args.output.resolve())))
