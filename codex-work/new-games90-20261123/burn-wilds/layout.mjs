const rect=(x,y,width,height)=>Object.freeze({x,y,width,height});

/** The canvas and real DOM controls consume the same measured rectangles. */
export function burnWildsLayout(width,height){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new TypeError('BURN_WILDS_VIEWPORT');
  const landscape=width/height>1.3,baseWidth=landscape?1360:390,baseHeight=landscape?768:740;
  const scale=Math.min(width/baseWidth,height/baseHeight),left=(width-baseWidth*scale)/2,top=(height-baseHeight*scale)/2;
  const fit=r=>rect(left+r.x*scale,top+r.y*scale,r.width*scale,r.height*scale);
  const board=landscape?rect(332,212,680,410):rect(14,181,362,222);
  const controls=landscape?{
    spin:rect(1137,296,156,156),auto:rect(1177,204,80,80),bet:rect(1177,470,80,80),
    quick:rect(1274,267,48,54),take:rect(1137,574,156,54),double:rect(1177,110,80,64),
    menu:rect(28,666,58,58),sound:rect(1273,666,58,58),balance:rect(378,664,165,48),stake:rect(806,664,165,48)
  }:{
    spin:rect(143,521,104,104),auto:rect(77,547,54,54),bet:rect(259,547,54,54),
    quick:rect(239,511,44,44),take:rect(319,547,54,54),double:rect(17,547,54,54),
    menu:rect(10,657,44,44),sound:rect(336,657,44,44),balance:rect(58,659,126,42),stake:rect(200,659,126,42)
  };
  return Object.freeze({width,height,landscape,scale,stage:fit(rect(0,0,baseWidth,baseHeight)),
    baseWidth,baseHeight,origin:Object.freeze({x:left,y:top}),board:fit(board),
    reels:Object.freeze(Array.from({length:5},(_,i)=>fit(rect(board.x+i*board.width/5,board.y,board.width/5,board.height)))),
    wheel:fit(landscape?rect(370,54,604,160):rect(36,99,318,90)),
    logo:fit(landscape?rect(30,93,330,90):rect(79,25,232,65)),
    win:fit(landscape?rect(455,630,430,27):rect(52,421,286,44)),
    controls:Object.freeze(Object.fromEntries(Object.entries(controls).map(([key,r])=>[key,fit(r)])))
  });
}

export function burnWildsPoint(layout,clientX,clientY,bounds){
  if(!bounds||bounds.width<=0||bounds.height<=0)return null;
  const x=(clientX-bounds.left)*layout.width/bounds.width,y=(clientY-bounds.top)*layout.height/bounds.height;
  return Object.freeze({x,y});
}

