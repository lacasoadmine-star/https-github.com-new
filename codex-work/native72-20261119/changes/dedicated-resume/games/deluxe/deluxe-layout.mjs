// Presentation geometry measured from the Deluxe demo. No game math lives here.
const box=(x,y,width,height)=>Object.freeze({x,y,width,height});
export const DELUXE_LAYOUTS=Object.freeze({
 portrait:Object.freeze({
  name:'portrait',width:420,height:900,
  board:box(103,125,280,280),reels:box(115,138,256,253),
  multiplier:box(42.45,153,61.1,226),logo:box(101,49,285,88)
 }),
 landscape:Object.freeze({
  name:'landscape',width:1366,height:768,
  board:box(470,105,440,450),reels:box(480,113,420,430),
  multiplier:box(354,142,120,379),logo:box(566,20,315,90)
 })
});

export function deluxeLayoutForViewport(width,height){
 return width>height?DELUXE_LAYOUTS.landscape:DELUXE_LAYOUTS.portrait;
}

// Crop the existing vertical artwork to fill a cabinet without stretching it.
export function coverSource(sourceWidth,sourceHeight,targetWidth,targetHeight){
 const scale=Math.max(targetWidth/sourceWidth,targetHeight/sourceHeight);
 const width=targetWidth/scale,height=targetHeight/scale;
 return {x:(sourceWidth-width)/2,y:(sourceHeight-height)/2,width,height};
}

const modulo=(value,length)=>((value%length)+length)%length;
export function multiplierAtPhase(phase){return modulo(Math.round(phase),5)+1;}

// The receipt supplies targetMultiplier. Extra turns are decorative, fixed,
// and never influence the selected multiplier, the reel stops, or the payout.
export function multiplierLandingPhase(fromPhase,targetMultiplier){
 const minimum=fromPhase+10;
 return minimum+modulo(targetMultiplier-1-minimum,5);
}

export function multiplierPhaseAt(fromPhase,toPhase,progress){
 const p=Math.max(0,Math.min(1,progress));
 return p===1?toPhase:fromPhase+(toPhase-fromPhase)*(1-(1-p)**3);
}
