// Explicit review of the actual deployed startup class. No browser, account,
// money, network fetch or production configuration is available to this test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {patchEntryStartup,patchEntryApp} from '../../deploy/smartsoft/entry-startup-r17.mjs';
const prefix=process.env.SMARTSOFT_STARTUP_REVIEW_PREFIX;
if(!prefix)throw Error('EXPLICIT_DEPLOYED_STARTUP_REVIEW_PREFIX_REQUIRED');
const temp=await mkdtemp(join(tmpdir(),'superwin-entry-r17-'));
await writeFile(join(temp,'startup-profile.mjs'),await readFile(prefix+'startup-profile.mjs'));
await writeFile(join(temp,'smartsoft-startup.mjs'),patchEntryStartup(await readFile(prefix+'smartsoft-startup.mjs','utf8')));
const {SmartSoftStartup}=await import(pathToFileURL(join(temp,'smartsoft-startup.mjs')));
const ids=['multihot100_native','habeshafortune5_native','multihotwildways_native','multihot5wild_native','multihot5superwilds_native','multihotdeluxe_native','burningice_native','burningice10_native','burningice40_native'];
function fixture(){
 const nodes=Object.fromEntries(['startupCover','startupLoader','startupSound','machineShell','startupYes','startupNo','startupFill','startupIcon','startupProgress','startupQuestion'].map(id=>[id,{hidden:id==='startupCover',inert:false,disabled:false,dataset:{},style:{setProperty(){}},lastElementChild:{textContent:''},addEventListener(){},setAttribute(){},focus(){}}]));
 return {nodes,document:{getElementById:id=>nodes[id],fonts:{load:()=>Promise.resolve([])}}};
}
for(const id of ids)test(id+': its own verified sound choice remains intact, with recovery accessible',()=>{
 const f=fixture();let time=0;const callbacks=[],choices=[];
 const startup=new SmartSoftStartup({gameId:id,document:f.document,now:()=>time,setTimer:fn=>{callbacks.push(fn);return callbacks.length;},clearTimer(){},onChoice:choice=>choices.push(choice)});
 assert.equal(startup.phase,'loading');assert.equal(startup.choice,null);assert.equal(startup.allowsStart(),false);assert.equal(f.nodes.startupCover.hidden,false);assert.deepEqual(choices,[]);
 let audioCalls=0;const mute=patchEntryApp('if(startup.active){soundEnabled=false;referenceScene.setAudio({sound:false,music:musicEnabled});}');
 const sound=new Function('startup','referenceScene','musicEnabled','let soundEnabled=true;'+mute+';return soundEnabled;')(startup,{setAudio(){audioCalls++;}},true);
 assert.equal(sound,false);assert.equal(audioCalls,1);
 const connected={connected:true,authenticated:true};startup.sync(connected,{ready:true});time=1000;startup.sync(connected,{ready:true});
 assert.equal(startup.phase,'sound');assert.equal(f.nodes.startupYes.disabled,false);assert.equal(startup.allowsStart(),false);assert.equal(startup.choose(false),true);assert.deepEqual(choices,[false]);
 assert.equal(startup.phase,'open');assert.equal(f.nodes.startupCover.hidden,true);assert.equal(f.nodes.machineShell.inert,false);startup.dispose();
 const pending=new SmartSoftStartup({gameId:id,document:f.document,setTimer:()=>1,clearTimer(){}});
 pending.sync({...connected,round:{status:'active'}},{ready:false});assert.equal(f.nodes.startupCover.hidden,true);assert.equal(f.nodes.machineShell.inert,false);pending.dispose();
});
test.after(()=>rm(temp,{recursive:true,force:true}));
