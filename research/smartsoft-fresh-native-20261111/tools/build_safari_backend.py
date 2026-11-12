#!/usr/bin/env python3
"""Add one verified independent model to the existing service; preserve its ledger."""
import base64,hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OLD=Path('/workspace/superwin-existing-integration')
source=OLD/'.private-slot-readable.mjs';runtime=source.read_text();bundle=(ROOT/'native-machines/safari-simba-2/server/bundle.mjs').read_bytes();model_sha=hashlib.sha256(bundle).hexdigest()
def change(before,after,count=1):
 global runtime
 actual=runtime.count(before)
 if actual!=count:raise ValueError('Source mismatch: '+before[:80]+' count='+str(actual))
 runtime=runtime.replace(before,after)
# The three previous math modules and every historical model identity stay intact.
old='const versioned = fresh74.createFreshSlotCore(previousVersioned, { sha256: "383b2348149f8eb50c14f26edfa6a1b3dc7816130d5d2ea1244d9b6ce855700a", enabled: process.env.FRESH74_ACCOUNT_RELEASE === "mh10-v1" });'
new='const safariModule=await import("data:text/javascript;base64,'+base64.b64encode(bundle).decode()+'");\nconst versioned=safariModule.createSafariSlotCore('+old.removeprefix('const versioned = ').removesuffix(';')+',{sha256:"'+model_sha+'",enabled:process.env.SAFARI_SIMBA_RELEASE==="native-scene-v1"});'
change(old,new)
start=runtime.index('function createFreshReleaseHooks(');end=runtime.index('class ServiceError',start)
factory=runtime[start:end];assert factory.count('const id = "fresh_multihot10";')==1
factory=factory.replace('({\n','({\n  gameId,\n',1).replace('const id = "fresh_multihot10";','const id=gameId??"fresh_multihot10";if(!isFreshBuilt(id))fail2(404,"FRESH_GAME_UNAVAILABLE");')
runtime=runtime[:start]+'const isFreshBuilt=id=>id==="fresh_multihot10"||id==="fresh_safarisimba";\n'+factory+runtime[end:]
line='  const freshRelease = createFreshReleaseHooks({ hash, authenticate, balance, lockWallets, transaction, cash, publicGames, modelIdentity, fail, isAccepting: () => accepting });'
change(line,line+'\n  const freshHookCache=new Map([["fresh_multihot10",freshRelease]]);\n  const freshReleaseFor=gameId=>{if(!isFreshBuilt(gameId))fail(404,"FRESH_GAME_UNAVAILABLE");if(!freshHookCache.has(gameId))freshHookCache.set(gameId,createFreshReleaseHooks({hash,authenticate,balance,lockWallets,transaction,cash,publicGames,modelIdentity,fail,isAccepting:()=>accepting,gameId}));return freshHookCache.get(gameId);};')
# Replace guard predicates only in the service's settlement/action functions.
start=runtime.index('  async function settle(req, body)');end=runtime.index('  async function action(',start)
part=runtime[start:end];assert part.count('gameId === "fresh_multihot10"')==2
part=part.replace('gameId === "fresh_multihot10"','isFreshBuilt(gameId)').replace('gameId !== "fresh_multihot10"','!isFreshBuilt(gameId)').replace('freshRelease.','freshReleaseFor(gameId).')
runtime=runtime[:start]+part+runtime[end:]
start=runtime.index('  async function action(');end=runtime.index('  async function reconcile(',start)
part=runtime[start:end];assert part.count('parent.game_id === "fresh_multihot10"')==6
part=part.replace('parent.game_id === "fresh_multihot10"','isFreshBuilt(parent.game_id)').replace('freshRelease.','freshReleaseFor(parent.game_id).')
runtime=runtime[:start]+part+runtime[end:]
change('if (req.method === "GET" && path === "/api/fresh-state") return json(await freshRelease.state(req, uid));','if (req.method === "GET" && path === "/api/fresh-state") return json(await freshReleaseFor(url.searchParams.get("gameId")??"fresh_multihot10").state(req, uid));')
out=ROOT/'native-machines/safari-simba-2/server/release';out.mkdir(exist_ok=True)
(out/'slot-runtime.mjs').write_text(runtime)
(out/'metadata.json').write_text(json.dumps({'baseRuntimeSha256':hashlib.sha256((OLD/'release/slot-runtime.mjs').read_bytes()).hexdigest(),'modelSha256':model_sha,'runtimeSha256':hashlib.sha256(runtime.encode()).hexdigest(),'modelId':'fresh_safarisimba','previousGamesChanged':0,'walletBalancesChanged':0,'newLedgerTables':0,'networkMutationsPerformed':0},indent=2))
print((out/'metadata.json').read_text())
