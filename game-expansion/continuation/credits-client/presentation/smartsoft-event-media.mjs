import {supportsSmartSoftMotion,SMARTSOFT_MOTION_PROFILES} from './smartsoft-motion.mjs';

// Public New/canvas.js and Slots/canvas.js default to gain1. The five title
// overrides below set background0.6 and high-win0.8. Commented-out WildWays
// gain assignments are intentionally not treated as active configuration.
const mixed=new Set(['multihot100_native','multihot5superwilds_native','multihotdeluxe_native','safarisimba_native','habeshafortune5_native']);
const common={music:'Start/Background.mp3','spin-start':'Buttons/Spin.mp3',button:'Buttons/Button.mp3',collect:'Buttons/DoubleTake.mp3','gamble-win':'Double/Win.mp3','gamble-loss':'Double/Lose.mp3','autoplay-start':'Buttons/AutoplayStart.mp3','autoplay-stop':'Buttons/AutoplayStop.mp3',freeze:'Start/Ice1.mp3',unfreeze:'Start/Ice2.mp3','freeze-logo':'Start/Logo2.mp3','unfreeze-logo':'Start/Logo1.mp3','coin-wild':'Start/Column.mp3','multiplier-win':'Start/WinMultiplier.mp3','win-ordinary':'Start/Win1.mp3','win-nice':'Start/Win2.mp3','win-big':'Start/Win3.mp3','win-super':'Start/Win4.mp3','win-fantastic':'Start/Win5.mp3','win-end':'Start/WinEnd.mp3'};
export function smartSoftSoundCue(manifest,event,{column=0,turbo=false,fast=false}={}){
 if(!supportsSmartSoftMotion(manifest?.id))return null;
 const legacy=SMARTSOFT_MOTION_PROFILES[manifest.id].engine==='legacy-ticks';
 let key=common[event]??null,volume=event==='music'&&mixed.has(manifest.id) ? .6 : /^win-(?:nice|big|super|fantastic|end)$/.test(event)&&mixed.has(manifest.id) ? .8 : 1;
 if(event==='reel-stop'){
  if(!Number.isInteger(column)||column<0||column>=manifest.grid.columns)return null;
  key=legacy?'Start/ObjectMoveStop.mp3':fast||turbo?'Start/ObjectMoveFast.mp3':'Start/ReelStop'+(column+1)+'.mp3';
 }
 if(event==='win')key=legacy?'Start/Line.mp3':manifest.id==='multihot100_native'?'Start/Win.mp3':['multihotwildways_native','multihot5wild_native'].includes(manifest.id)?'Start/Win1.mp3':'Start/LineWin.mp3';
 if(legacy&&event==='win-big')key='Start/Win2.mp3';
 if(legacy&&event==='win-super')key='Start/Win3.mp3';
 if(legacy&&event==='collect')key='Start/WinToBalance.mp3';
 const entry=key&&manifest.audio?.[key];
 if(!entry||!manifest.files?.[entry.file])return null;
 return{key,volume,loop:event==='music',source:'presentation/evidence/smartsoft-motion-source.json'};
}
