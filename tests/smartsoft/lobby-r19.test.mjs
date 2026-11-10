import test from 'node:test';
import assert from 'node:assert/strict';
import {installConstructionPlayer} from '../../deploy/smartsoft/construction-player-r15.mjs';
import {patchLobbyUI} from '../../deploy/smartsoft/lobby-ui-r19.mjs';
import {UI_SOURCE} from '../../deploy/smartsoft/operator-ui-source-r16.mjs';
const prefix='/native-library/remaining20/20261110-construction-r15/';

test('fresh and older retained roots load one current lobby bootstrap without the old Preparing initializer',async()=>{
 for(const old of ['',`<script data-construction-r15 type="module" src="${prefix}queue-ui.mjs"></script>`,`<script data-construction-r15 type="module" src="${prefix}queue-ui-r16.mjs"></script>`]){
  const original='<html><head><script data-zplay-account-entry-r13 type="module" src="/native-library/remaining20/20261110-account-entry-r13/lobby.mjs?v=16"></script>'+old+'</head><body>original player</body></html>';
  const app=installConstructionPlayer({fetch:async()=>new Response(original,{headers:{'content-type':'text/html'}})});
  const response=await app.fetch(new Request('https://player.test/'),{PORTAL:'player'}),html=await response.text();
  assert.equal(html.split(prefix+'queue-ui-r19.mjs').length,2);assert.ok(!html.includes('data-zplay-account-entry-r13'));assert.ok(!html.includes('queue-ui-r16.mjs'));assert.ok(html.includes('original player'));assert.equal(response.headers.get('cache-control'),'no-store');
 }
});

test('revised public lobby cannot change the health-verified LIVE predicate or game routes',()=>{
 const source=patchLobbyUI(UI_SOURCE);
 for(const retained of ["operational=new Map((Array.isArray(data.operationalGames)?data.operationalGames:[])","const live=game.financialRelease===true&&operational.has(game.nativeId)&&game.playHref==='/games/'+game.nativeId;","location.assign('/games/'+id)","window[Symbol.for('zplay.account-entry.r13')]?.dispose();"]){assert.ok(source.includes(retained));}
 assert.throws(()=>patchLobbyUI(source),/RETAINED_LOBBY_CONTRACT_CHANGED/);
});
