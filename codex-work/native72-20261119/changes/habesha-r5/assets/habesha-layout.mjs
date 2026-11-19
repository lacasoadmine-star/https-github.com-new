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
 board:{x:430,y:49,width:500,height:525},
 grid:{x:456,y:138,width:445,height:388},
 logo:{x:538,y:41,width:302,height:87},
 multiplier:{x:314,y:159,width:140,height:344},
 multiplierBorder:{x:317,y:163,width:134,height:337},
 values:{x:322,y:180,width:124,height:75,step:108}
});
export function habeshaLayout(width,height){return width>height?HABESHA_LANDSCAPE:HABESHA_PORTRAIT;}

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
