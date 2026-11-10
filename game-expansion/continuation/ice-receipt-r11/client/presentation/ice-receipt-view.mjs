const IDS=new Set(['burningice10_native','burningice40_native']);
const minor=value=>typeof value==='string'&&/^(0|[1-9]\d{0,18})$/.test(value);
const sameGrid=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((column,c)=>Array.isArray(column)&&Array.isArray(b[c])&&column.length===b[c].length&&column.every((symbol,r)=>symbol===b[c][r]));

// The server receipt stores incremental awards, including an empty final
// respin. The public BlazingHot client reveals all held lines on that final
// result. Combine accepted deltas for drawing only; never evaluate symbols,
// generate outcomes, edit the receipt, or send a financial request.
export function iceReceiptView(id,round,frameIndex=null){
 if(!IDS.has(id)||!round||!Array.isArray(round.frames)||!round.frames.length||round.omittedFrames>0)return null;
 const frames=round.frames,index=frameIndex===null?frames.length-1:frameIndex;
 if(!Number.isInteger(index)||index<0||index>=frames.length||frames.length>4096)return null;
 if(frames.some(frame=>frame?.feature?.type!=='freeze-respin'||!Array.isArray(frame.grid)||!Array.isArray(frame.wins)||!minor(frame.payoutMinor)))return null;
 const visible=frames[index],terminal=index===frames.length-1;
 if(frameIndex===null&&!sameGrid(round.grid,visible.grid))return null;
 // Public SlotClass keeps line highlights hidden until the feature finishes.
 if(!terminal)return {...visible,wins:[],payoutMinor:'0'};
 const held=new Map();let total=0n;
 for(let f=0;f<=index;f++){
  const frame=frames[f];let frameTotal=0n;
  for(const win of frame.wins){
   if(!win||!minor(win.payoutMinor)||!Array.isArray(win.cells)||!win.cells.length)return null;
   const key=Number.isInteger(win.line)&&win.line>0?'line:'+win.line:win.scatter===true?'scatter:'+String(win.symbol):null;
   if(!key||!Number.isInteger(win.count)||win.count<1)return null;
   if(win.cells.some(cell=>!Array.isArray(cell)||cell.length!==2||!cell.every(Number.isInteger)||cell[0]<0||cell[1]<0||frame.grid[cell[0]]?.[cell[1]]===undefined))return null;
   const previous=held.get(key);
   if(previous&&previous.symbol!==win.symbol)return null;
   const payoutMinor=BigInt(win.payoutMinor)+(previous?BigInt(previous.payoutMinor):0n);
   held.set(key,{...win,cells:win.cells.map(cell=>cell.slice()),payoutMinor:String(payoutMinor),sourceFrame:f});
   frameTotal+=BigInt(win.payoutMinor);
  }
  if(frameTotal!==BigInt(frame.payoutMinor))return null;
  total+=frameTotal;
 }
 const wins=[];
 for(const win of held.values()){
  const source=frames[win.sourceFrame].grid;
  // A held line may be shown only on the same accepted cells. A mismatched
  // recovery receipt cannot display a stale line over a different result.
  if(win.cells.some(([c,r])=>source[c][r]!==visible.grid[c]?.[r]))return null;
  const {sourceFrame,...display}=win;wins.push(display);
 }
 if(minor(round.baseWinMinor)&&total!==BigInt(round.baseWinMinor))return null;
 return {...visible,wins,payoutMinor:String(total)};
}
