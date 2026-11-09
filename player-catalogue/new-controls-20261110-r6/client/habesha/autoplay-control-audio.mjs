// Source: New/Components/buttons.js selects ButtonsAutoPlay on the idle
// AUTO button and ButtonsAutoPlayStop in Stop mode before AutoPlay.click().
// These four current NEW titles already lock both original audio files.
// This helper only emits a UI sound; it does not start, stop or count rounds.
export const AUTOPLAY_CONTROL_AUDIO_IDS=Object.freeze([
 'habeshafortune5_native','multihotwildways_native',
 'multihot5wild_native','multihotdeluxe_native',
]);

export function playAutoplayControlAudio({gameId,action,active,play}={}){
 if(!AUTOPLAY_CONTROL_AUDIO_IDS.includes(gameId)||typeof play!=='function')return false;
 const cue=action==='open'&&active===false?'autoplay-start':action==='stop'&&active===true?'autoplay-stop':null;
 if(!cue)return false;
 // Audio failure must never block the existing UI or autoplay cancellation.
 try{void Promise.resolve(play(cue)).catch(()=>{});return true;}catch{return false;}
}
