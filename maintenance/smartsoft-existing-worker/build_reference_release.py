#!/usr/bin/env python3
"""Prepare an additive release for the user's existing Railway services."""
import argparse
import base64
import gzip
import hashlib
import json
import os
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parent
RESEARCH=Path('/workspace/official-game-research-2026-11-11')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def live_catalogue():
    official=json.loads((RESEARCH/'catalogues/smartsoft-games.json').read_text())
    canonical=json.loads((ROOT/'state/nine-games.json').read_text())['games']
    by_url={g.get('observedSource'):g for g in canonical if g.get('freshRegistration')}
    games=[]
    for game in official['games']:
        current=by_url.get(game['official_url'])
        if current is None:
            raise ValueError('Missing canonical registration: '+game['name'])
        item={**game,'backend_id':current['id'],'screenshots':[],'audio':[],'video':None,
              'build_status':current.get('buildStatus'),'financial_enabled':current.get('freshReleaseReady') is True}
        item.pop('original_demo_url',None)
        games.append(item)
    assert len(games)==74 and len({g['backend_id'] for g in games})==74
    return {'provider':'SmartSoft Gaming','source_url':official['source_url'],
            'updated_at':official['retrieved_at'],'games':games}


def build():
    catalogue=json.loads((RESEARCH/'catalogues/smartsoft-games.json').read_text())
    runtime=(ROOT/'decoded/nine-slot/runtime-0.txt').read_text()
    baseline=runtime
    import_line=runtime.splitlines()[0]
    insert='\nconst REFERENCE_CATALOGUE='+json.dumps(catalogue,ensure_ascii=False,separators=(',',':'))+';\n'
    runtime=runtime.replace(import_line,import_line+insert,1)
    guard="if(values.some(v=>v<0n)||b-s+w!==a)throw new Error('WALLET_SETTLEMENT_MISMATCH');"
    assert runtime.count(guard)==1
    runtime=runtime.replace(guard,"if(values.some(v=>v<0n)||b<s||b-s+w!==a)throw new Error('WALLET_SETTLEMENT_MISMATCH');")
    # Use the house row already locked by private state, retaining the existing
    # pre-draw reserve check and every stored wallet/round record.
    for before,after in json.loads((ROOT/'capacity-source-patches.json').read_text()):
        assert runtime.count(before)==1, 'Existing capacity source changed'
        runtime=runtime.replace(before,after,1)
    receipt_end="return {currency:'ETB',balanceBefore:money(b),chargedStake:money(s),finalWin:money(w),balanceAfter:money(a),netChange:money(w-s)};\n }"
    assert runtime.count(receipt_end)==1
    runtime=runtime.replace(receipt_end,receipt_end+"\n const referenceReceiptCheck=referenceReceiptVerification(settlementReceipt);",1)
    retained="return {fetch:fetchHandler,pool,redis,transaction,settle,reconcile,setEnabled(v)"
    assert runtime.count(retained)==1
    runtime=runtime.replace(retained,"return {fetch:fetchHandler,pool,redis,transaction,settle,reconcile,referenceReceiptCheck,setEnabled(v)",1)
    serve="Bun.serve({hostname:'0.0.0.0',port:Number(process.env.PORT||3000),fetch:service.fetch});"
    assert runtime.count(serve)==1
    runtime=runtime.replace(serve,(ROOT/'reference-finance-addon.mjs').read_text()+'\n'+serve,1)
    # Preserve the exact inner module bytes while compressing their common source
    # together. The previous nested gzip/base64 payload nearly filled Linux's
    # per-argument limit and cannot fit a larger ./run.sh release safely.
    import re
    preserved_modules={}
    pattern=r"const (coreBytes|revisedBytes|fresh74Bytes)=gunzipSync\(Buffer.from\('([A-Za-z0-9+/=]+)','base64'\)\);"
    def unpack_inner(match):
        data=gzip.decompress(base64.b64decode(match[2]))
        preserved_modules[match[1]]=sha(data)
        return 'const '+match[1]+'=Buffer.from('+json.dumps(data.decode(),ensure_ascii=False)+",'utf8');"
    runtime,unpacked=re.subn(pattern,unpack_inner,runtime)
    assert unpacked==3
    output=ROOT/'release';output.mkdir(exist_ok=True)
    (output/'slot-runtime.mjs').write_text(runtime)
    packed=subprocess.run(['node','-e',"const f=require('node:fs'),z=require('node:zlib');process.stdout.write(z.brotliCompressSync(f.readFileSync(process.argv[1]),{params:{[z.constants.BROTLI_PARAM_QUALITY]:11}}));",str(output/'slot-runtime.mjs')],check=True,capture_output=True).stdout
    source="""import pg from 'pg';
import Redis from 'ioredis';
import { brotliDecompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
void pg; void Redis;
const runtimeBytes = brotliDecompressSync(Buffer.from('%s', 'base64'));
if (runtimeBytes.length !== %d || createHash('sha256').update(runtimeBytes).digest('hex') !== '%s') throw new Error('NATIVE_RUNTIME_INTEGRITY_MISMATCH');
const runtimeURL = new URL('./native-slot-runtime.mjs', import.meta.url);
await writeFile(runtimeURL, runtimeBytes, { mode: 0o600 });
await import(runtimeURL.href);
"""%(base64.b64encode(packed).decode(),len(runtime.encode()),sha(runtime.encode()))
    (output/'nine-slot-function.ts').write_text(source)
    slot_command='./run.sh '+base64.b64encode(source.encode()).decode()
    assert len(slot_command)<131000, 'Function start command exceeds Linux argument limit'
    spec={'code':source,'slotStartCommand':slot_command,
          'metadata':{'baselineRuntimeSha256':sha(baseline.encode()),'newRuntimeSha256':sha(runtime.encode()),
                      'functionCharacters':len(source),'slotCommandCharacters':len(slot_command),'preservedInnerModules':preserved_modules,'canonicalCount':len(catalogue['games']),
                      'publicReferenceDashboard':False,'playerWebsiteChanges':False}}
    path=ROOT/'.reference-deploy-spec.json'
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
    with os.fdopen(fd,'w')as handle:json.dump(spec,handle)
    (output/'release-metadata.json').write_text(json.dumps(spec['metadata'],indent=2)+'\n')
    print(json.dumps(spec['metadata']))


if __name__=='__main__':
    build()
