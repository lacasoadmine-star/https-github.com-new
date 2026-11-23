"""Add a scoped operator release to the existing Railway Function bootstrap.

All original packed modules are verified by the retained bootstrap first.
Only the current adapter wiring changes; wallets, evaluators and recovery stay.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import re
import zlib

ROOT=Path(__file__).resolve().parent
sha=lambda value:hashlib.sha256(value).hexdigest()

def build(original,native_root):
    source=original.decode()
    match=re.search(r'const exactModules=(\{[^\n]+\});\nif\(Object\.keys\(files\)',source)
    if not match:raise ValueError('EXISTING_NATIVE_BOOTSTRAP_CHANGED')
    inventory=json.loads(match[1])
    if len(inventory)!=61:raise ValueError('EXISTING_NATIVE_MODULE_COUNT_CHANGED')
    policy=json.loads((ROOT/'operator-policy-r16.json').read_text())
    for item in policy['evidence']:
        if inventory.get(item['path'],{}).get('sha256')!=item['sha256']:
            raise ValueError('LIVE_NATIVE_REVIEW_SOURCE_CHANGED:'+item['path'])
        if sha((native_root/item['path']).read_bytes())!=item['sha256']:
            raise ValueError('LOCAL_NATIVE_REVIEW_SOURCE_CHANGED:'+item['path'])
    name='remaining20/server/remaining20-adapters.mjs'
    prior=(native_root/name).read_text()
    if sha(prior.encode())!=inventory[name]['sha256']:raise ValueError('NATIVE_ADAPTER_SOURCE_CHANGED')
    import_old="import {approvedOperatorSmartsoft as operatorSmartsoft} from './remaining20-release-approval.mjs';"
    import_new="import {operationalOperatorSmartsoft as operatorSmartsoft,operatorStartAllowed} from './operator-entry-r16.mjs';"
    start_old="return process.env.REMAINING20_ACCEPT_NEW_ROUNDS==='true'&&remainingGameIds.includes(definition?.id)&&"
    start_new="return operatorStartAllowed(definition)||(process.env.REMAINING20_ACCEPT_NEW_ROUNDS==='true'&&remainingGameIds.includes(definition?.id)&&"
    end_old="!Object.hasOwn(remainingScopeBlocks,definition?.id)&&isMachineReleased(definition);"
    end_new="!Object.hasOwn(remainingScopeBlocks,definition?.id)&&isMachineReleased(definition));"
    for old in [import_old,start_old,end_old]:
        if prior.count(old)!=1:raise ValueError('EXISTING_NATIVE_ADAPTER_CONTRACT_CHANGED')
    updated=prior.replace(import_old,import_new).replace(start_old,start_new).replace(end_old,end_new)
    modules={name:updated}
    for file in ['operator-policy-r16.mjs','operator-entry-r16.mjs','operator-policy-r16.json']:
        modules['remaining20/server/'+file]=(ROOT/file).read_text()
    payload=json.dumps({'coreEvidence':policy['evidence'],'previousAdapterSha256':inventory[name]['sha256'],'modules':modules},separators=(',',':')).encode()
    encoded=base64.b64encode(zlib.compress(payload,9)).decode()
    injection="""// Scoped owner-authorized native ETB release. Original modules were checked above.
const operatorPatchBytes=inflateSync(Buffer.from('%s','base64'),{maxOutputLength:%d});
if(operatorPatchBytes.length!==%d||hash(operatorPatchBytes)!=='%s')throw Error('OPERATOR_RELEASE_PATCH_INTEGRITY_FAILED');
const operatorPatch=JSON.parse(operatorPatchBytes.toString('utf8'));
for(const item of operatorPatch.coreEvidence)if(hash(files[item.path])!==item.sha256)throw Error('OPERATOR_CORE_SOURCE_CHANGED:'+item.path);
if(hash(files['remaining20/server/remaining20-adapters.mjs'])!==operatorPatch.previousAdapterSha256)throw Error('OPERATOR_ADAPTER_SOURCE_CHANGED');
for(const[name,value]of Object.entries(operatorPatch.modules)){
 if(name!=='remaining20/server/remaining20-adapters.mjs'&&Object.hasOwn(files,name))throw Error('OPERATOR_RELEASE_MODULE_COLLISION');
 files[name]=value;
}
"""%(encoded,len(payload),len(payload),sha(payload))
    anchor='for(const [name,code]of Object.entries(files)){'
    if source.count(anchor)!=1:raise ValueError('NATIVE_BOOTSTRAP_WRITE_CONTRACT_CHANGED')
    import_old="import {brotliDecompressSync} from 'node:zlib';"
    import_new="import {brotliDecompressSync,inflateSync} from 'node:zlib';"
    if source.count(import_old)!=1:raise ValueError('NATIVE_BOOTSTRAP_DECOMPRESSION_CONTRACT_CHANGED')
    output=source.replace(import_old,import_new).replace(anchor,injection+anchor)
    entry="export default addition.installRemaining(existing,app.existingLibraryDependencies,{ASSETS:client.ASSETS,ART:artwork.ART});"
    if output.count(entry)!=1:raise ValueError('EXISTING_FUNCTION_ENTRY_CHANGED')
    preflight="console.info(JSON.stringify({event:'remaining_native_etb_release',releaseId:'remaining-native-etb-r16',enabled:process.env.REMAINING20_OPERATOR_ETB_RELEASE==='remaining-native-etb-r16',launchable:Object.values(app.existingLibraryDependencies.service.registry.remainingDefinitions()).filter(game=>game.operatorRelease?.id==='remaining-native-etb-r16').map(game=>game.id)}));\n"
    output=output.replace(entry,preflight+entry)
    # Railway's function runner passes the encoded source as one argument.
    # Stay below Linux MAX_ARG_STRLEN without changing the existing runtime.
    if len(base64.b64encode(output.encode()))+len('./run.sh ')>=131072:
        raise ValueError('EXISTING_FUNCTION_ARGUMENT_SIZE_LIMIT_EXCEEDED')
    return output,modules

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--original',type=Path,required=True)
    parser.add_argument('--native-root',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    original=args.original.read_bytes();code,modules=build(original,args.native_root)
    args.output.write_text(code)
    print(json.dumps({'originalSha256':sha(original),'newSha256':sha(code.encode()),'bytes':len(code.encode()),'patchedAdapter':'remaining20/server/remaining20-adapters.mjs','newModules':len(modules)-1,'coreFinancialAndEvaluatorFilesChanged':0}))
