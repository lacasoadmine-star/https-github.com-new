// Cues map host-confirmed events to this title's already hash-locked media.
// No event here can submit an action, settle money, or select an outcome.
import {prepareTowerXTransition,animateTowerXScene} from './towerx-native-presentation.mjs';
import {prepareCoinCompletionTransition,animateCoinCompletionScene} from './coinminer-completion-motion.mjs';
const TRACKS = {
  towerx_native: {
    music:'audio_MainTheme', 'spin-start':'audio_PlaceBet', button:'audio_ButtonsClick',
    'reel-stop':'audio_SmallLanding', step:'audio_SmallLanding', win:'audio_WinLow',
    'big-win':'audio_WinLarge', collect:'audio_JumpWin',
  },
  coinminer_native: {
    'spin-start':'sound_game_starter', button:'sound_button_clicked', pick:'sound_tile_click',
    'prize-reveal':'sound_prize_reveal', win:'sound_win', collect:'sound_win', loss:'sound_loss',
  },
};
const SPRITES = {
  'spin-start':'hang', step:'floorDrop', 'reel-stop':'floorDrop', freeze:'frozenFloor',
  temple:'templeFloor', triple:'floorDropTriple', 'wheel-spin':'wheelRotate',
  loss:'floorFail', win:'win', collect:'win', 'big-win':'bigWin',
};

export function arcadeSoundCue(manifest,event) {
  if(manifest?.id==='towerrush_native') {
    if(event==='music')return manifest.audio?.audio_background_music?{key:'audio_background_music',loop:true}:null;
    const name=SPRITES[event],range=manifest.controls?.audioSpriteMilliseconds?.[name];
    if(!manifest.audio?.audio_effects||!Array.isArray(range)||range.length!==2||!range.every(Number.isFinite)||range[0]<0||range[1]<=0)return null;
    return {key:'audio_effects',offsetSeconds:range[0]/1000,durationSeconds:range[1]/1000,loop:false};
  }
  const key=TRACKS[manifest?.id]?.[event];
  return key&&manifest.audio?.[key]?{key,loop:event==='music'}:null;
}

export const FROZEN_MOBILE_REFERENCE=Object.freeze({
  skeletonSha256:'8b6a1baa284e60057b5df47591ad670634aa62828fe525cd9d75cc15867cfabb',
  animation:'frozen_mob',frames:38,frameSeconds:.0417,idleAtSeconds:1.6,
  source:'presentation/arcade/assets.lock.json',
});

// The captured default Coin Miner config has a finite two-child opening, not
// a prize bounce: open_anim moves each transparent half by30px and fades it.
// Its runtime inserts the missing position0 key and interpolates linearly.
// start_anim is the next-game board reset and must not be used for a win.
export const COIN_MINER_REVEAL_REFERENCE=Object.freeze({
  configSha256:'bf6da7d6d24be9cb081bc287234fb0870fca942de7ed66b1468932d82f308999',
  runtimeSha256:'cf80c61777289229fe02429fe400d7f3360c8609074022d482b1e652ff4750e5',
  durationMs:500,translationX:Object.freeze([-30,30]),alpha:Object.freeze([1,0]),timing:'linear',
  evidence:'presentation/arcade/evidence/coinminer-reveal-source.json',
});
const COIN_REVEAL_FRAMES=Object.freeze(['tile1','tile2','prize1','bonus_label']);
const COIN_REVEAL_HASHES=Object.freeze([
  '973435f6989247024a46a014ef4faf8f95b922263c49a85ebddfd487c1b67d0d',
  'b91d393dc115798f2bc75e0ddd353d94aaf8fc2dd9273f1658359a22ce0c722b',
  'b3652142dabac686e83052b89019521a59d5c979e4da33706fe478a26046e704',
  '410da2431ea57dde283c632bb42c3bcaa5046622e9d2158e4a285404fe87d2e2',
]);
const EMPTY_FRAMES=Object.freeze([]);
export function arcadeTransitionFrames(manifest){
  const tiles=manifest?.layout?.tiles;
  if(manifest?.id!=='coinminer_native'||manifest.controls?.referenceVariant!=='coin_miner_94'||
    tiles?.tile_width!==60||tiles.tile_height!==60||tiles.asset_closed_display!=='mix'||
    !COIN_REVEAL_FRAMES.every((key,index)=>{
      const frame=manifest.frames?.[key],file=frame&&manifest.files?.[frame.file];
      return frame?.textureSha256===COIN_REVEAL_HASHES[index]&&file?.sha256===COIN_REVEAL_HASHES[index];
    }))return EMPTY_FRAMES;
  return COIN_REVEAL_FRAMES;
}

const sameCoinIdentity=(round,manifest)=>round&&(round.game_id??round.gameId)===manifest.id&&
  (round.model_version??round.modelVersion)===manifest.modelVersion&&typeof round.round_id==='string'&&round.round_id.length>0&&
  Number.isSafeInteger(round.version)&&round.version>=0&&['active','settled'].includes(round.status);
const safeRevealStatus=round=>round.status==='active'||round.status==='settled'&&round.reason==='all-safe'&&
  typeof round.payoutMinor==='string'&&/^[1-9]\d*$/.test(round.payoutMinor)&&round.currentCashoutMinor===round.payoutMinor;
const validPicks=picks=>Array.isArray(picks)&&picks.length<=24&&picks.every((pick,index)=>
  pick&&Number.isInteger(pick.index)&&pick.index>=0&&pick.index<25&&pick.safe===true&&
  picks.findIndex(other=>other?.index===pick.index)===index);
const samePick=(a,b)=>a?.index===b?.index&&a?.safe===b?.safe&&(a?.treasureBoost===true)===(b?.treasureBoost===true);

// Read-only receipt transition annotation. No prior accepted snapshot means no
// animation: restoring a saved round must display its accepted final artwork.
// priorTransition carries the same receipt through busy/ready repaints. The
// host's existing receipt timestamp controls elapsed time and is never reset
// here. A collection, loss, skipped version or other round clears the effect.
function prepareCoinReveal(scene,manifest,previousSnapshot,nextSnapshot,priorTransition=null){
  if(!arcadeTransitionFrames(manifest).length||scene?.gameId!==manifest.id)return scene;
  const before=previousSnapshot?.round,after=nextSnapshot?.round;
  if(previousSnapshot?.confirmed!==true||previousSnapshot.authenticated!==true||nextSnapshot?.confirmed!==true||nextSnapshot.authenticated!==true||
    typeof previousSnapshot.sessionId!=='string'||!previousSnapshot.sessionId||previousSnapshot.sessionId!==nextSnapshot.sessionId||
    !sameCoinIdentity(before,manifest)||!sameCoinIdentity(after,manifest)||!safeRevealStatus(after)||before.round_id!==after.round_id||scene.confirmedReceiptId!==after.round_id||
    !validPicks(before.picks)||!validPicks(after.picks))return scene;
  const last=after.picks.at(-1);
  if(priorTransition?.kind==='coin-native-safe-reveal'&&priorTransition.roundId===after.round_id&&
    priorTransition.receiptVersion===after.version&&priorTransition.modelVersion===manifest.modelVersion&&
    priorTransition.pickIndex===last?.index&&before.version===after.version&&
    before.picks.length===after.picks.length&&before.picks.every((pick,index)=>samePick(pick,after.picks[index])))return {...scene,arcadeTransition:priorTransition};
  // The last safe pick may be atomically paid by the server. Its financial
  // settled status must not remove the accepted closed-to-safe visual change.
  // Collection/reload never adds a pick and therefore cannot start this effect.
  if(before.status!=='active'||after.version!==before.version+1||after.picks.length!==before.picks.length+1||
    !before.picks.every((pick,index)=>samePick(pick,after.picks[index]))||!last)return scene;
  const prize=scene.commands.find(command=>command.role==='coin-confirmed-prize'&&command.tileIndex===last.index);
  if(!prize||prize.frame!=='prize1')return scene;
  return {...scene,arcadeTransition:Object.freeze({kind:'coin-native-safe-reveal',roundId:after.round_id,
    receiptVersion:after.version,modelVersion:manifest.modelVersion,pickIndex:last.index,
    sourceSha256:COIN_MINER_REVEAL_REFERENCE.configSha256})};
}

function animateCoinReveal(scene,manifest,elapsedMs){
  const transition=scene.arcadeTransition;
  if(!arcadeTransitionFrames(manifest).length||transition?.kind!=='coin-native-safe-reveal'||
    transition.roundId!==scene.confirmedReceiptId||transition.modelVersion!==manifest.modelVersion||
    !Number.isFinite(elapsedMs)||elapsedMs<0||elapsedMs>=COIN_MINER_REVEAL_REFERENCE.durationMs)return scene;
  const prize=scene.commands.find(command=>command.role==='coin-confirmed-prize'&&command.tileIndex===transition.pickIndex);
  if(!prize)return scene;
  const progress=elapsedMs/COIN_MINER_REVEAL_REFERENCE.durationMs;
  // The original closed halves sit above the revealed prize and bonus badge.
  // Appending these two commands preserves their source z-order across tiles.
  const covers=COIN_REVEAL_FRAMES.slice(0,2).map((frame,half)=>({type:'sprite',frame,
    box:{...prize.box,x:prize.box.x+(scene.coinTiles?.open_anim?.[half]?.key_frames?.[0]?.translate_x??COIN_MINER_REVEAL_REFERENCE.translationX[half])*progress},
    opacity:1-progress,role:'coin-reveal-cover',tileIndex:transition.pickIndex,half}));
  return {...scene,commands:[...scene.commands,...covers]};
}

// The official frozen_mob attachment sequence has38 source frames, followed
// by the ice38 idle attachment at1.6s. Apply it only to the newly confirmed
// frozen floor; previously accepted floor artwork stays in its idle pose.
export function animateArcadeScene(scene,manifest,elapsedMs,options={}) {
  if(manifest?.id==='towerx_native')return animateTowerXScene(scene,manifest,elapsedMs);
  if(manifest?.id==='coinminer_native')return animateCoinCompletionScene(animateCoinReveal(scene,manifest,elapsedMs),manifest,elapsedMs,options);
  if(manifest?.id!=='towerrush_native'||!Number.isFinite(elapsedMs)||elapsedMs<0||
    !manifest.spines?.frozen?.skeletonFile?.startsWith(FROZEN_MOBILE_REFERENCE.skeletonSha256+'.'))return scene;
  const seconds=elapsedMs/1000,index=seconds>=1.6?38:Math.min(37,Math.floor(seconds/.0417));
  const frame='spine/Frozen_web/Frozen_web_'+index;
  if(!manifest.frames?.[frame])return scene;
  let changed=false;
  const commands=scene.commands.map(command=>{
    if(command.role!=='frozen-overlay'||command.animate!==true)return command;
    changed=true;return {...command,frame};
  });
  return changed?{...scene,commands}:scene;
}

export function prepareArcadeTransition(scene,manifest,previousSnapshot,nextSnapshot,priorTransition=null){
  if(manifest?.id==='towerx_native')return prepareTowerXTransition(scene,manifest,previousSnapshot,nextSnapshot,priorTransition);
  const opening=prepareCoinReveal(scene,manifest,previousSnapshot,nextSnapshot,priorTransition);
  return manifest?.id==='coinminer_native'?prepareCoinCompletionTransition(opening,manifest,previousSnapshot,nextSnapshot,priorTransition):opening;
}
