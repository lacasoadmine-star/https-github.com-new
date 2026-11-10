// Continue the existing native legacy reel travel while the server is still
// confirming. Decorative symbols never become an outcome before a receipt.
export function patchPendingIceMotion(source){
 const init="Array.from({length:this.profile.columns},(_,column)=>({frame:-column*10,y:0,render:0,stopIndex:0,settled:false,blur:false,impact:false}))";
 const changes=[
  ['legacySteps:0,legacy:[],',"legacySteps:0,legacy:this.profile.engine==='legacy-ticks'?"+init+':[],'],
  ['   s.legacy='+init+';', '   s.legacySteps=0;if(!s.legacy.length)s.legacy='+init+';'],
  ["  const legacy=p.engine==='legacy-ticks'&&s.received?this.legacyPositions():null;", "  const legacy=p.engine==='legacy-ticks'?this.legacyPositions():null;"],
  ["s.received?legacy[column]:{phase:'awaiting',position:0,settled:false,blur:false,impact:false}", 'legacy[column]'],
  ['    if(r.y<=0){r.y=-Math.sin(x*3)*10;r.render=r.y;}',
   '    if(!s.received&&r.y>=maxY-500){const first=p.rows*p.cellHeight,span=maxY-500-first;r.y=first+(r.y-first)%span;r.render=r.y;r.blur=true;r.impact=false;}\n    if(r.y<=0){r.y=-Math.sin(x*3)*10;r.render=r.y;}'],
  ["phase:r.settled?'settled':r.render>=maxY-p.rows*p.cellHeight?'landing':r.render<=0?'lift':'loop'", "phase:!s.received?(r.render<=0?'lift':'loop'):r.settled?'settled':r.render>=maxY-p.rows*p.cellHeight?'landing':r.render<=0?'lift':'loop'"],
  ['settled:r.settled,impact:r.impact', 'settled:s.received&&r.settled,impact:s.received&&r.impact'],
 ];
 for(const[before,after]of changes){if(typeof source!=='string'||source.split(before).length!==2)throw Error('RETAINED_ICE_MOTION_CHANGED');source=source.replace(before,after);}
 return source;
}
