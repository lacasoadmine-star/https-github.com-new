import test from 'node:test';
import assert from 'node:assert/strict';
import {patchAutoplayApp} from '../../deploy/smartsoft/autoplay-app-r17.mjs';

const source=`
const actions={play:()=>ui.play.click(),autoplay:()=>ui.autoplay.click(),bet:()=>ui.bet.click()};
ui.stopAutoplay.addEventListener('click',()=>{autoplay.stop('user-stop');if(currentState)drawState(currentState);});
function syncNativeControls(){
 for(const[name,button]of nativeButtons){
  if(['play','autoplay'].includes(name)&&ui[name])button.disabled=ui[name].disabled||ui[name].hidden;
  if(name==='bet'||name==='buyBonus')button.disabled=ui.stake.disabled;
 }
}
return {actions,syncNativeControls};`;

function run(body,{active=false,disabled=false,hidden=false}={}){
 const counts={open:0,stop:0,existingStopSound:0,submit:0},listeners=new Map();
 const autoplay={snapshot:()=>({active}),stop:reason=>{assert.equal(reason,'user-stop');active=false;counts.stop++;}};
 const ui={autoplay:{disabled,hidden,click(){if(!this.disabled)counts.open++;}},stopAutoplay:{addEventListener(name,fn){listeners.set(name,fn);},click(){counts.existingStopSound++;listeners.get('click')();}},
  play:{disabled:false,hidden:false,click(){counts.submit++;}},bet:{click(){}},stake:{disabled:true}};
 const button={disabled:true,labels:{},setAttribute(name,value){this.labels[name]=value;}},other={disabled:false};
 const module=Function('autoplay','ui','nativeButtons','currentState','drawState',body)(autoplay,ui,new Map([['autoplay',button],['bet',other]]),{},()=>{});
 return {module,counts,button,other,ui};
}

test('the original native AUTO hit target is disabled during automatic play; the patch delegates to the retained stop listener',()=>{
 const before=run(source,{active:true,disabled:true});before.module.syncNativeControls();assert.equal(before.button.disabled,true);
 const after=run(patchAutoplayApp(source),{active:true,disabled:true});after.module.syncNativeControls();
 assert.equal(after.button.disabled,false);assert.equal(after.button.labels['aria-label'],'Stop autoplay');
 after.module.actions.autoplay();assert.equal(after.counts.stop,1);assert.equal(after.counts.open,0);assert.equal(after.counts.submit,0);assert.equal(after.counts.existingStopSound,1);
 assert.equal(after.ui.autoplay.disabled,true);assert.equal(after.other.disabled,true);
});

test('idle AUTO still opens its original dialog, and blocked idle controls stay disabled',()=>{
 const normal=run(patchAutoplayApp(source));normal.module.syncNativeControls();assert.equal(normal.button.disabled,false);assert.equal(normal.button.labels['aria-label'],'Autoplay');normal.module.actions.autoplay();assert.equal(normal.counts.open,1);assert.equal(normal.counts.stop,0);
 const blocked=run(patchAutoplayApp(source),{disabled:true});blocked.module.syncNativeControls();assert.equal(blocked.button.disabled,true);blocked.module.actions.autoplay();assert.equal(blocked.counts.open,0);assert.equal(blocked.counts.stop,0);
 const hidden=run(patchAutoplayApp(source),{hidden:true});hidden.module.syncNativeControls();assert.equal(hidden.button.disabled,true);
});

test('unexpected or repeated controller source contracts fail closed before projection',()=>{
 for(const changed of [null,'export {};',source.replace("autoplay.stop('user-stop')","autoplay.stop('other')"),source+"\nautoplay:()=>ui.autoplay.click()",patchAutoplayApp(source)])assert.throws(()=>patchAutoplayApp(changed),/CONTRACT_CHANGED/);
});

