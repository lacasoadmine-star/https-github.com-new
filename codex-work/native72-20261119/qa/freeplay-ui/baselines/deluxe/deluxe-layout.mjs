// Own-game presentation geometry from the desktop atlas and public config.
// These coordinates never select a result, change a strip, or calculate a win.
const box=(x,y,width,height)=>Object.freeze({x,y,width,height});
export const DELUXE_LAYOUTS=Object.freeze({
 portrait:Object.freeze({
  name:'portrait',width:420,height:900,
  board:box(103,125,280,280),reels:box(115,138,256,253),
  multiplier:box(42.45,153,61.1,226),logo:box(101,49,285,88)
 }),
 landscape:Object.freeze({
  name:'landscape',width:2170,height:1220,
  background:box(-150,0,2470,1220),
  board:box(740,160,715,733),reels:box(694,187,746,675),
  reelMask:Object.freeze([[713,862],[702,862],[699,641],[694,358],[695,187],[709,187],[1378,187],[1431,187],[1432,353],[1433,627],[1440,862],[1369,862]].map(point=>Object.freeze(point))),
  symbol:Object.freeze({x:612,y:89,width:500,height:500,stepX:230,stepY:217}),
  symbolWinOffsets:Object.freeze([-402,-402,-393,-397,-402,-407,-404,-403,-403]),
  multiplier:box(563,227,197,604),multiplierOrigin:Object.freeze({x:436,y:177}),
  logo:Object.freeze({x:1145,y:85,scale:1}),
  line:box(755,225,680,608)
 })
});

export function deluxeLayoutForViewport(width,height){
 return width>height?DELUXE_LAYOUTS.landscape:DELUXE_LAYOUTS.portrait;
}

// The retained portrait cabinet uses its own vertical artwork.
export function coverSource(sourceWidth,sourceHeight,targetWidth,targetHeight){
 const scale=Math.max(targetWidth/sourceWidth,targetHeight/sourceHeight);
 const width=targetWidth/scale,height=targetHeight/scale;
 return {x:(sourceWidth-width)/2,y:(sourceHeight-height)/2,width,height};
}

const modulo=(value,length)=>((value%length)+length)%length;
export function multiplierAtPhase(phase){return modulo(Math.round(phase),5)+1;}

export const DELUXE_TIMINGS=Object.freeze({
 start:125,lead:200,cycle:125,turboCycle:200,stop:125,columnDelay:450,
 multiplierLoop:400,multiplierTurboLoop:325,multiplierStop:300,multiplierTurboStop:262.5,
 lineFade:200,lineHold:1000,lineCycle:1400
});

export function deluxeMotionProfile(turbo=false){
 const cycle=turbo?DELUXE_TIMINGS.turboCycle:DELUXE_TIMINGS.cycle;
 return {duration:DELUXE_TIMINGS.lead+DELUXE_TIMINGS.start+3*cycle+2*DELUXE_TIMINGS.stop,
  stagger:turbo?0:DELUXE_TIMINGS.columnDelay,startStagger:0,travel:9,
  wheelEnd:turbo?DELUXE_TIMINGS.multiplierTurboStop:DELUXE_TIMINGS.multiplierStop};
}

// Land the same downward-moving strip window on the already-validated stop.
// Extra full turns are presentation only. Every stop is supplied by the receipt.
export function reelLandingPhase(fromPhase,previousStop,targetStop,stripLength){
 const minimum=Math.ceil(fromPhase)+9;
 return minimum+modulo(previousStop-targetStop-minimum,stripLength);
}

export function reelWindowAtPhase(strip,previousStop,phase,first=-2,last=4){
 const whole=Math.floor(phase),fraction=phase-whole;
 return Array.from({length:last-first+1},(_,i)=>{
  const row=first+i;
  return {row:row+fraction,symbol:strip[modulo(previousStop-1-whole+row,strip.length)]};
 });
}

export function symbolBox(layout,column,row){
 if(layout.symbol){const s=layout.symbol;return box(s.x+column*s.stepX,s.y+row*s.stepY,s.width,s.height);}
 const s=layout.reels;return box(s.x+column*s.width/3,s.y+row*s.height/3,s.width/3,s.height/3);
}

// The receipt supplies targetMultiplier. Extra turns are decorative, fixed,
// and never influence the selected multiplier, the reel stops, or the payout.
export function multiplierLandingPhase(fromPhase,targetMultiplier){
 const minimum=Math.ceil(fromPhase)+3;
 return minimum+modulo(targetMultiplier-1-minimum,5);
}

export function multiplierPhaseAt(fromPhase,toPhase,progress){
 const p=Math.max(0,Math.min(1,progress));
 if(p===0)return fromPhase;
 // A small, bounded back settle preserves the exact final multiplier.
 const t=p-1,eased=1+2.2*t*t*t+1.2*t*t;
 return p===1?toPhase:fromPhase+(toPhase-fromPhase)*eased;
}
