// Independent presentation geometry. Outcome and wallet values stay server-owned.
export const HABESHA_PORTRAIT = Object.freeze({
 width:420,height:900,landscape:false,
 board:{x:86,y:105,width:315,height:315},
 grid:{x:100,y:151,width:288,height:235},
 logo:{x:125,y:65,width:235,height:73},
 multiplier:{x:18,y:155,width:78,height:226},
 multiplierBorder:{x:20,y:158,width:74,height:220},
 values:{x:22,y:170,width:69,height:48,step:73}
});
export const HABESHA_LANDSCAPE = Object.freeze({
 width:1366,height:768,landscape:true,
 board:{x:428,y:69.5,width:510,height:510*810/811},
 grid:{x:469.5,y:139.3,width:425.1,height:386.1},
 reels:{x:382.1,y:48.75,columnStep:225*510/811,rowStep:205*510/811,width:500*510/811,height:500*510/811},
 logo:{x:459,y:25,width:436,height:125},
 multiplier:{x:312.25,y:149.25,width:240*510/811,height:579*510/811},
 multiplierBorder:{x:312.25+15*510/811,y:149.25+20*510/811,width:219*510/811,height:532*510/811},
 values:{x:312.25+65*510/811,y:149.25+70*510/811,width:145*510/811,height:100*510/811,step:170*510/811}
});
export function habeshaLayout(width,height){return width>height?HABESHA_LANDSCAPE:HABESHA_PORTRAIT;}

// Normal numbers and their glowing counterparts have different source sizes.
// Both use the cabinet's source-pixel scale; each window clips its own layer.
export function habeshaMultiplierGeometry(layout){
 const {x,y,width,height}=layout.multiplier,sx=width/240,sy=height/579;
 const rect=(left,top,w,h)=>({x:x+left*sx,y:y+top*sy,width:w*sx,height:h*sy});
 return {normal:{...rect(65,70,145,100),step:170*sy},active:{dx:-105*sx,dy:-80*sy,width:320*sx,height:270*sy},masks:[rect(65,30,175,152),rect(35,205,165,170),rect(55,393,185,142)]};
}

export const INITIAL_MULTIPLIER_VALUES=Object.freeze([3,5,1]);
const mod=(value,length)=>((value%length)+length)%length;
function cosmeticHash(value){let hash=2166136261;for(const char of String(value))hash=Math.imul(hash^char.charCodeAt(0),16777619);return hash>>>0;}

// These are neighboring pictures only. The selected value comes unchanged
// from a validated receipt; stable cosmetic choices also survive a replay.
export function multiplierNeighbors(selected,identity='',chooseIndex=null){
 if(!Number.isInteger(selected)||selected<1||selected>5)throw Error('INVALID_PRESENTATION_MULTIPLIER');
 const choices=[1,2,3,4,5].filter(value=>value!==selected);
 const pick=salt=>{
  const index=chooseIndex?chooseIndex(choices.length,salt,identity):cosmeticHash(identity+':'+selected+':'+salt)%choices.length;
  if(!Number.isInteger(index)||index<0||index>=choices.length)throw Error('INVALID_COSMETIC_INDEX');
  return choices.splice(index,1)[0];
 };
 return [pick('above'),selected,pick('below')];
}
export function multiplierTrack(values,seed=''){return {initial:[values[2],values[1],values[0]],seed:String(seed),landing:null};}
export function multiplierValueAt(track,index){
 if(track.landing&&Math.abs(index-track.landing.index)<=1)return track.landing.values[1-(index-track.landing.index)];
 if(index>=0&&index<3)return track.initial[index];
 return 1+mod(cosmeticHash(track.seed+':'+index),5);
}
export function settleMultiplierTrack(track,start,selected,identity='',chooseIndex=null){
 const end=Math.ceil(start+10),values=multiplierNeighbors(selected,identity,chooseIndex);
 return {end,values,track:{...track,landing:{index:end,values}}};
}

export function pendingReelPhase(previousStop,elapsed){return previousStop-1+Math.max(0,elapsed)/95;}
export function settledReelPhase(start,stop,stripLength,minTravel=12){
 const target=((stop-1)%stripLength+stripLength)%stripLength;
 return target+Math.ceil((start+minTravel-target)/stripLength)*stripLength;
}
// Cubic interpolation keeps the speed inherited from the pending API phase,
// then decelerates to the exact validated stop with zero terminal velocity.
export function reelPhaseAt(start,end,progress,duration){
 const p=Math.max(0,Math.min(1,progress)),tangent=Math.min(duration/95,3*(end-start));
 return (2*p*p*p-3*p*p+1)*start+(p*p*p-2*p*p+p)*tangent+(-2*p*p*p+3*p*p)*end;
}
