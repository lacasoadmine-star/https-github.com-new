import test from 'node:test';
import assert from 'node:assert/strict';
import {patchEntryStartup,patchEntryApp,nativeEntryPhase,ENTRY_LOADING_CSS} from '../../deploy/smartsoft/entry-startup-r17.mjs';

test('all verified sound choices and their original audio callback are preserved',()=>{
 const source="export class SmartSoftStartup {constructor(gameId){this.profile=smartSoftStartupProfile(gameId);this.active=!!this.profile;this.choice=null;this.phase=this.active?'loading':'open';this.paint('loading');}}";
 const patched=patchEntryStartup(source);
 assert.equal(patched,source);
 for(const changed of [source.replace('this.choice=null;','this.choice=true;'),source+source])assert.throws(()=>patchEntryStartup(changed),/STARTUP_ENTRY_CONTRACT_CHANGED/);
 const mute='if(startup.active){soundEnabled=false;referenceScene.setAudio({sound:false,music:musicEnabled});}';
 assert.equal(patchEntryApp(mute),mute);assert.throws(()=>patchEntryApp(mute+mute),/STARTUP_APP_AUDIO_CONTRACT_CHANGED/);
});

test('initial generic cabinet stays covered while errors and accepted recovery remain visible',()=>{
 assert.equal(nativeEntryPhase(), 'loading');
 assert.equal(nativeEntryPhase({integrated:true}), 'ready');
 for(const property of ['error','recovery','attention'])assert.equal(nativeEntryPhase({[property]:true}), 'attention');
 assert.equal(ENTRY_LOADING_CSS,'html[data-native-entry="loading"] #machineShell{visibility:hidden}');
});
