// Draw the server-provided paths. These diagrams never calculate a payout.
export function paylineChart(model) {
  const cols=model.reels, rows=model.rows;
  if(!Number.isInteger(cols)||cols<1||cols>5||rows!==3||!Array.isArray(model.linePaths))throw Error('INVALID_CHART');
  return model.linePaths.map((line,index)=>{
    if(!Array.isArray(line)||line.length!==cols||line.some(r=>!Number.isInteger(r)||r<0||r>=rows))throw Error('INVALID_CHART_PATH');
    const width=cols*20;
    const points=line.map((r,c)=>`${c*20+10},${r*18+9}`).join(' ');
    let dots='';
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)dots+=`<circle cx="${c*20+10}" cy="${r*18+9}" r="2" fill="#3d655f"/>`;
    return `<figure><svg viewBox="0 0 ${width} 54" role="img" aria-label="Payline ${index+1}">${dots}<polyline points="${points}" fill="none" stroke="#edcf74" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><figcaption>${index+1}</figcaption></figure>`;
  }).join('');
}
