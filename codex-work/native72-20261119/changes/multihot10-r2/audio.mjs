// Multi Hot 10: lifecycle-aware native audio, using only the existing sound files.
// Hidden/blurred tabs must immediately stop all effects/music. Focus resumes
// music only if the Player had previously opted in; it never auto-starts on load.
export async function createAudio(){
 const names=await fetch('../assets/sounds.json').then(r=>r.json());
 const music=new Audio('../assets/'+names['Background.mp3']);music.loop=true;
 const active=new Set();let effects=false,musicOn=false,blurred=false,destroyed=false;
 const silent=()=>destroyed||document.hidden||blurred;
 const stopEffects=()=>{for(const a of active){try{a.pause();a.currentTime=0;}catch{}}active.clear()};
 const updateMusic=()=>{if(!silent()&&musicOn){void music.play().catch(()=>{});}else music.pause()};
 const onBlur=()=>{blurred=true;stopEffects();updateMusic()};
 const onFocus=()=>{blurred=false;if(document.hidden){stopEffects()}updateMusic()};
 const onVisibility=()=>{if(document.hidden)stopEffects();updateMusic()};
 const onHide=()=>{blurred=true;stopEffects();updateMusic()};
 window.addEventListener('blur',onBlur);
 window.addEventListener('focus',onFocus);
 window.addEventListener('pagehide',onHide);
 document.addEventListener('visibilitychange',onVisibility);
 return {
  set(e,m){effects=e===true;musicOn=m===true;if(!effects||silent())stopEffects();updateMusic()},
  play(name){if(!effects||silent()||!names[name])return;const a=new Audio('../assets/'+names[name]);active.add(a);a.onended=()=>active.delete(a);a.onerror=()=>{a.pause();active.delete(a)};void a.play().catch(()=>{a.pause();active.delete(a)})},
  stop(){stopEffects();music.pause()},
  destroy(){if(destroyed)return;destroyed=true;window.removeEventListener('blur',onBlur);window.removeEventListener('focus',onFocus);window.removeEventListener('pagehide',onHide);document.removeEventListener('visibilitychange',onVisibility);stopEffects();music.pause()}
 }
}
