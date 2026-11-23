export {patchEntryStartup as patchStartup,patchEntryApp} from './entry-startup-r17.mjs';

// Current two-title and remaining-seven hosts already attach abort signals and
// motion identity guards. Preserve those callbacks rather than rewrite audio.
export function patchAudioHost(source){
 if(typeof source!=='string'||!source.includes('export class ReferencePresentationHost')||
  !source.includes('isCurrent:()=>!this.disposed&&this.motion===motion')||
  !source.includes('?.abort()'))throw Error('AUDIO_HOST_OWNERSHIP_CONTRACT_CHANGED');
 return source;
}
