const SVG_NS='http://www.w3.org/2000/svg';
const FAMILIES=new Set(['wheel','plinko','dice']);
const DEFAULT_COLORS=['#63d6b7','#f2c675','#9aaeff'];
const labels={wheel:'ORBIT WHEEL',plinko:'BEAD DROP',dice:'ROLL LAB'};
const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const multiplier=value=>Number.isSafeInteger(value)?(value/10000).toFixed(value%10000===0?0:2)+'×':'—';
function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function svg(tag,attributes={},text){const n=document.createElementNS(SVG_NS,tag);for(const [key,value]of Object.entries(attributes))n.setAttribute(key,String(value));if(text!==undefined)n.textContent=text;return n;}
const point=(cx,cy,r,angle)=>[cx+r*Math.cos(angle*Math.PI/180),cy+r*Math.sin(angle*Math.PI/180)];
function arc(cx,cy,r,start,end){const a=point(cx,cy,r,start),b=point(cx,cy,r,end);return `M${cx} ${cy}L${a[0]} ${a[1]}A${r} ${r} 0 ${end-start>180?1:0} 1 ${b[0]} ${b[1]}Z`;}

function checkDefinition(game){
  if(!game||!FAMILIES.has(game.family)||typeof game.id!=='string')throw new TypeError('An instant game definition is required.');
  if(game.family==='wheel'){
    if(!Array.isArray(game.sectors)||game.sectors.length<2||game.sectors.length>24)throw new TypeError('A published wheel sector list is required.');
    const ids=new Set();
    for(const sector of game.sectors){
      if(typeof sector.id!=='string'||ids.has(sector.id)||typeof sector.label!=='string'||!integer(sector.weight,1,1000000)||!integer(sector.multiplierBps,0,Number.MAX_SAFE_INTEGER))throw new TypeError('Invalid published wheel sector.');
      ids.add(sector.id);
    }
  }
  if(game.family==='plinko'&&(!integer(game.rows,3,20)||!Array.isArray(game.bucketMultipliersBps)||game.bucketMultipliersBps.length!==game.rows+1||game.bucketMultipliersBps.some(n=>!integer(n,0,Number.MAX_SAFE_INTEGER))))throw new TypeError('A published Plinko board is required.');
  if(game.family==='dice'&&(!integer(game.minTarget,1,99)||!integer(game.maxTarget,game.minTarget,99)||!integer(game.defaultTarget,game.minTarget,game.maxTarget)))throw new TypeError('A published roll target range is required.');
}

export function validateInstantRound(game,round){
  checkDefinition(game);
  if(!round||round.gameId!==game.id||round.mathVersion!==game.mathVersion||round.family!==game.family||!['lost','collected'].includes(round.status))throw new TypeError('A matching, settled server round is required.');
  const outcome=round.outcome;
  if(!outcome||outcome.kind!==game.family||!integer(outcome.multiplierBps,0,Number.MAX_SAFE_INTEGER)||outcome.multiplierBps!==round.multiplierBps||typeof round.winMinor!=='string'||!/^(0|[1-9][0-9]*)$/.test(round.winMinor))throw new TypeError('The server outcome is incomplete.');
  if(game.family==='wheel'&&(!game.sectors.some(s=>s.id===outcome.sector)||typeof outcome.label!=='string'))throw new TypeError('The server wheel sector is unavailable.');
  if(game.family==='plinko'){
    if(!Array.isArray(outcome.path)||outcome.path.length!==game.rows||outcome.path.some(bit=>bit!==0&&bit!==1)||!integer(outcome.bucket,0,game.rows)||outcome.path.reduce((n,bit)=>n+bit,0)!==outcome.bucket)throw new TypeError('The server Plinko path is incomplete.');
  }
  if(game.family==='dice'&&(!integer(outcome.roll,0,99)||!integer(outcome.target,game.minTarget,game.maxTarget)||typeof outcome.success!=='boolean'||!integer(outcome.offeredMultiplierBps,0,Number.MAX_SAFE_INTEGER)))throw new TypeError('The server roll is incomplete.');
  return outcome;
}

/** Original artwork and motion only. This module never requests, settles or calculates a bet. */
export function mountInstant(container,{game,reducedMotion=false,audio,onStatus=()=>{}}={}){
  if(!(container instanceof Element))throw new TypeError('A renderer container is required.');
  checkDefinition(game);
  const family=game.family,colors=DEFAULT_COLORS.map((fallback,i)=>/^#[0-9a-f]{6}$/i.test(game.theme?.colors?.[i]||'')?game.theme.colors[i]:fallback);
  const root=node('section','ir-instant ir-'+family);
  root.dataset.gameId=game.id;
  colors.forEach((color,i)=>root.style.setProperty('--ir-color-'+(i+1),color));
  const heading=node('div','ir-heading');
  heading.append(node('span','ir-kicker',labels[family]),node('span','ir-name',game.catalogName||game.title||'Independent game'));
  const surface=node('div','ir-surface');surface.setAttribute('role','img');surface.setAttribute('aria-label',labels[family]+' ready.');
  const image=svg('svg',{viewBox:'0 0 640 480','aria-hidden':'true',focusable:'false',preserveAspectRatio:'xMidYMid meet'});
  surface.append(image);
  const legend=node('ol','ir-legend');
  const readout=node('div','ir-readout');readout.setAttribute('role','status');readout.setAttribute('aria-live','polite');readout.setAttribute('aria-atomic','true');
  const resultTitle=node('strong','ir-result-title','Ready for your next round');
  const resultDetail=node('span','ir-result-detail','The account server confirms every result.');
  readout.append(resultTitle,resultDetail);root.append(heading,surface,legend,readout);container.replaceChildren(root);
  let destroyed=false,frame=0,lastPaint=0,currentAngle=0,finalize=null,resolveAnimation=null,waiting=false,lastOutcome=null;
  const notify=message=>{try{onStatus(message);}catch{}};
  const sound=kind=>{if(!document.hidden)try{audio?.play?.(kind);}catch{}};
  const lessMotion=()=>typeof reducedMotion==='boolean'?reducedMotion:Boolean(reducedMotion?.matches);
  function halt({finish=false}={}){
    if(frame)cancelAnimationFrame(frame);frame=0;
    const finishNow=finalize,resolveNow=resolveAnimation;finalize=null;resolveAnimation=null;
    if(finish&&finishNow)finishNow();
    resolveNow?.({cancelled:!finish});
  }
  function animate(duration,paint,finish){
    halt();
    return new Promise(resolve=>{
      let began=null;lastPaint=0;resolveAnimation=resolve;finalize=finish;
      const step=stamp=>{
        if(destroyed){halt();return;}
        began??=stamp;
        const elapsed=stamp-began,progress=Math.min(1,elapsed/duration);
        if(progress===1||stamp-lastPaint>=1000/30){paint(progress,elapsed);lastPaint=stamp;}
        if(progress===1){halt({finish:true});return;}
        frame=requestAnimationFrame(step);
      };
      frame=requestAnimationFrame(step);
    });
  }
  const defs=svg('defs');
  const glow=svg('radialGradient',{id:'ir-glow-'+game.id});glow.append(svg('stop',{offset:'0%','stop-color':colors[0],'stop-opacity':'.22'}),svg('stop',{offset:'100%','stop-color':colors[0],'stop-opacity':'0'}));defs.append(glow);image.append(defs,svg('ellipse',{cx:320,cy:255,rx:290,ry:215,fill:`url(#ir-glow-${game.id})`}));
  let disc,ball,trail,buckets=[],digits=[],rollMarker,targetMarker,targetRange,targetLabel;
  let wheelTotal=0,wheelAngles=[];
  const wheelGroups=[];

  if(family==='wheel'){
    wheelTotal=game.sectors.reduce((n,s)=>n+s.weight,0);
    image.append(svg('ellipse',{cx:320,cy:445,rx:150,ry:19,fill:'#000','fill-opacity':'.24'}),svg('path',{d:'M281 388H359L389 445H251Z',fill:'#203545',stroke:'#5c788a','stroke-width':3}),svg('circle',{cx:320,cy:238,r:199,fill:'#0d1928',stroke:'#73919b','stroke-width':4}));
    disc=svg('g');image.append(disc);let cursor=-90;
    game.sectors.forEach((sector,i)=>{
      const width=sector.weight/wheelTotal*360,end=cursor+width,mid=(cursor+end)/2;
      const group=svg('g',{'data-sector':sector.id});
      const slice=svg('path',{d:arc(320,238,190,cursor,end),fill:colors[i%colors.length],'fill-opacity':i%2?'.55':'.8',stroke:'#e5f7ff','stroke-opacity':'.16','stroke-width':2});
      slice.append(svg('title',{},`${sector.label}: ${multiplier(sector.multiplierBps)}; weight ${sector.weight} of ${wheelTotal}`));group.append(slice);
      if(width>=22){const [x,y]=point(320,238,144,mid);group.append(svg('text',{x,y,fill:'#fff','font-size':17,'font-weight':800,'text-anchor':'middle','dominant-baseline':'middle',transform:`rotate(${mid+90} ${x} ${y})`},multiplier(sector.multiplierBps)));}
      disc.append(group);wheelGroups.push(group);wheelAngles.push(mid);cursor=end;
      const item=node('li','ir-legend-item');item.dataset.sector=sector.id;
      const swatch=node('span','ir-swatch');swatch.style.backgroundColor=colors[i%colors.length];
      const copy=node('span','ir-legend-copy');copy.append(node('strong','',sector.label),node('small','',multiplier(sector.multiplierBps)+' · '+sector.weight+'/'+wheelTotal));
      item.append(swatch,copy);legend.append(item);
    });
    image.append(svg('circle',{cx:320,cy:238,r:53,fill:'#142538',stroke:'#a6b8bc','stroke-width':3}),svg('circle',{cx:320,cy:238,r:40,fill:'#1b3545'}),svg('path',{d:'M320 214L337 238 320 262 303 238Z',fill:colors[1]}),svg('path',{d:'M305 34H335L320 70Z',fill:'#fff3cf',stroke:'#6b5334','stroke-width':2}));
  } else if(family==='plinko'){
    legend.hidden=true;
    const dx=540/(game.rows+1),dy=350/(game.rows+1);
    image.append(svg('path',{d:'M320 40L600 427Q320 470 40 427Z',fill:'#12273a','fill-opacity':'.6',stroke:'#7594ac','stroke-opacity':'.22','stroke-width':2}));
    for(let row=0;row<game.rows;row++)for(let column=0;column<=row;column++)image.append(svg('circle',{cx:320+(column-row/2)*dx,cy:80+row*dy,r:game.rows>12?3.3:4.5,fill:'#dae9f1','fill-opacity':'.75'}));
    game.bucketMultipliersBps.forEach((bps,i)=>{
      const x=320+(i-game.rows/2)*dx,group=svg('g',{'data-bucket':i});
      group.append(svg('rect',{x:x-dx*.44,y:426,width:dx*.88,height:35,rx:6,fill:colors[i%colors.length],'fill-opacity':'.18',stroke:colors[i%colors.length],'stroke-opacity':'.65'}),svg('text',{x,y:448,'text-anchor':'middle',fill:'#eaf7ff','font-size':game.rows>10?10:12,'font-weight':700},multiplier(bps)));
      image.append(group);buckets.push(group);
    });
    trail=svg('polyline',{fill:'none',stroke:colors[0],'stroke-opacity':'.38','stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'});
    ball=svg('circle',{cx:320,cy:45,r:8,fill:'#fff4d1',stroke:colors[1],'stroke-width':3});image.append(trail,ball);
  } else {
    legend.hidden=true;
    image.append(svg('ellipse',{cx:320,cy:352,rx:220,ry:28,fill:'#000','fill-opacity':'.2'}));
    for(let i=0;i<2;i++){
      const x=i?338:156,group=svg('g');
      group.append(svg('rect',{x,y:128,width:146,height:170,rx:24,fill:'#11283a',stroke:colors[i],'stroke-width':3}),svg('path',{d:`M${x+14} 142L${x+132} 142 ${x+132} 282 ${x+14} 282Z`,fill:colors[i],'fill-opacity':'.08'}));
      const number=svg('text',{x:x+73,y:222,fill:'#f3fbff','font-size':94,'font-weight':800,'text-anchor':'middle','dominant-baseline':'middle'},'—');
      group.append(number);image.append(group);digits.push({group,number,cx:x+73});
    }
    image.append(svg('text',{x:320,y:82,'text-anchor':'middle',fill:'#9eb7c8','font-size':17,'letter-spacing':5},'ROLL 00—99'),svg('rect',{x:70,y:378,width:500,height:13,rx:6,fill:'#142d40'}));
    targetRange=svg('rect',{x:70,y:378,width:game.defaultTarget*5,height:13,rx:6,fill:colors[0],'fill-opacity':'.7'});
    targetMarker=svg('path',{d:`M${70+game.defaultTarget*5} 370v28`,stroke:'#e8f5fc','stroke-width':2});
    rollMarker=svg('circle',{cx:70,cy:384.5,r:8,fill:'#fff4d0',stroke:colors[1],'stroke-width':3,visibility:'hidden'});
    targetLabel=svg('text',{x:320,y:432,'text-anchor':'middle',fill:'#c3d7e4','font-size':18},'Target below '+game.defaultTarget);
    image.append(targetRange,targetMarker,rollMarker,targetLabel,svg('text',{x:70,y:421,fill:'#8ca8bd','font-size':14},'00'),svg('text',{x:570,y:421,'text-anchor':'end',fill:'#8ca8bd','font-size':14},'99'));
  }

  function resetHighlights(){
    for(const g of wheelGroups)g.classList.remove('ir-selected');
    for(const item of legend.children)item.classList.remove('ir-selected');
    for(const group of buckets)group.classList.remove('ir-selected');
    root.classList.remove('ir-win','ir-loss');
  }
  function displayResult(round,outcome){
    waiting=false;root.classList.remove('ir-awaiting','ir-revealing');root.setAttribute('aria-busy','false');
    root.classList.add(outcome.multiplierBps>0?'ir-win':'ir-loss');
    let detail;
    if(family==='wheel'){
      const index=game.sectors.findIndex(s=>s.id===outcome.sector);
      wheelGroups[index].classList.add('ir-selected');legend.children[index].classList.add('ir-selected');
      detail=outcome.label+' · '+multiplier(outcome.multiplierBps);
    }else if(family==='plinko'){
      buckets[outcome.bucket].classList.add('ir-selected');detail='Bucket '+outcome.bucket+' · '+multiplier(outcome.multiplierBps);
    }else detail='Roll '+String(outcome.roll).padStart(2,'0')+' · target below '+outcome.target+' · '+multiplier(outcome.multiplierBps);
    resultTitle.textContent=outcome.multiplierBps>0?'Server-confirmed award':'Round complete';
    resultDetail.textContent=detail;surface.setAttribute('aria-label',labels[family]+'. '+detail+'. Server-confirmed result.');
    notify(resultTitle.textContent+'. '+detail);
    sound(outcome.multiplierBps>=100000?'big':outcome.multiplierBps>0?'win':'lose');
    lastOutcome=outcome;
  }
  function start(){
    if(destroyed)return;
    halt();resetHighlights();waiting=true;lastOutcome=null;root.classList.add('ir-awaiting');root.classList.remove('ir-revealing');root.setAttribute('aria-busy','true');
    resultTitle.textContent='Waiting for the server';resultDetail.textContent='Motion does not determine the result.';surface.setAttribute('aria-label',labels[family]+'. Waiting for the server result.');
    notify('Waiting for the server result.');sound('start');
    if(ball){ball.setAttribute('cx',320);ball.setAttribute('cy',45);trail.setAttribute('points','');}
    if(digits.length){digits.forEach(d=>d.number.textContent='—');rollMarker.setAttribute('visibility','hidden');}
    if(lessMotion())return;
    const before=currentAngle;
    // Cosmetic waiting motion is bounded and paints at no more than 30 frames/second.
    animate(12000,(p,ms)=>{
      if(disc){currentAngle=before+ms*.065;disc.setAttribute('transform',`rotate(${currentAngle} 320 238)`);}
      if(ball)ball.setAttribute('cy',45+Math.sin(ms/170)*4);
      if(digits.length)digits.forEach((d,i)=>d.group.setAttribute('transform',`rotate(${Math.sin(ms/130+i)*2} ${d.cx} 210)`));
    },()=>{});
  }
  async function show(round){
    if(destroyed)return {cancelled:true};
    let outcome;
    try{outcome=validateInstantRound(game,round);}
    catch(error){halt();waiting=false;root.setAttribute('aria-busy','false');root.classList.remove('ir-awaiting','ir-revealing');resultTitle.textContent='Result unavailable';resultDetail.textContent='Refresh the confirmed round.';notify('The server result could not be displayed. Refresh the round.');throw error;}
    halt();resetHighlights();waiting=false;root.classList.remove('ir-awaiting');root.classList.add('ir-revealing');root.setAttribute('aria-busy','true');
    resultTitle.textContent='Revealing confirmed result';resultDetail.textContent='The account server has already resolved this round.';
    const finish=()=>displayResult(round,outcome);
    if(family==='wheel'){
      const index=game.sectors.findIndex(s=>s.id===outcome.sector),base=-90-wheelAngles[index];
      const startAngle=currentAngle,delta=((base-startAngle)%360+360)%360,finishAngle=startAngle+1080+delta;
      return animate(lessMotion()?70:1950,(p,ms)=>{
        currentAngle=startAngle+(finishAngle-startAngle)*(1-(1-p)**4);disc.setAttribute('transform',`rotate(${currentAngle} 320 238)`);
      },()=>{currentAngle=finishAngle;disc.setAttribute('transform',`rotate(${currentAngle} 320 238)`);finish();});
    }
    if(family==='plinko'){
      const dx=540/(game.rows+1),dy=350/(game.rows+1),path=[{x:320,y:45}];let x=320;
      outcome.path.forEach((bit,i)=>{x+=(bit===1?1:-1)*dx/2;path.push({x,y:80+(i+.65)*dy});});
      path.push({x:320+(outcome.bucket-game.rows/2)*dx,y:420});
      let tick=-1;
      return animate(lessMotion()?70:900+game.rows*65,p=>{
        const step=Math.min(path.length-2,Math.floor(p*(path.length-1))),part=Math.min(1,p*(path.length-1)-step),a=path[step],b=path[step+1];
        const position={x:a.x+(b.x-a.x)*part,y:a.y+(b.y-a.y)*part-Math.sin(part*Math.PI)*5};
        ball.setAttribute('cx',position.x);ball.setAttribute('cy',position.y);
        trail.setAttribute('points',[...path.slice(0,step+1),position].map(q=>q.x+','+q.y).join(' '));
        if(step>tick){if(!lessMotion())sound('tick');tick=step;}
      },()=>{ball.setAttribute('cx',path.at(-1).x);ball.setAttribute('cy',420);trail.setAttribute('points',path.map(q=>q.x+','+q.y).join(' '));finish();});
    }
    const roll=String(outcome.roll).padStart(2,'0');
    targetRange.setAttribute('width',outcome.target*5);targetMarker.setAttribute('d',`M${70+outcome.target*5} 370v28`);targetLabel.textContent='Target below '+outcome.target;
    return animate(lessMotion()?70:950,p=>{
      digits.forEach((d,i)=>{const shake=Math.sin(p*Math.PI*10+i)*(1-p)*12;d.group.setAttribute('transform',`translate(0 ${-Math.sin(p*Math.PI)*16}) rotate(${shake} ${d.cx} 210)`);d.number.textContent=p>.65?roll[i]:'·';});
    },()=>{digits.forEach((d,i)=>{d.group.removeAttribute('transform');d.number.textContent=roll[i];});rollMarker.setAttribute('cx',70+outcome.roll/99*500);rollMarker.setAttribute('visibility','visible');finish();});
  }
  function stop(){
    if(destroyed)return;
    const revealing=Boolean(finalize)&&root.classList.contains('ir-revealing');
    halt({finish:revealing});
    if(digits.length)digits.forEach(d=>d.group.removeAttribute('transform'));
    if(waiting){resultDetail.textContent='Motion stopped. Waiting for the server result.';notify('Motion stopped. The server result is still pending.');}
  }
  const visibility=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',visibility);
  function destroy(){if(destroyed)return;destroyed=true;halt();document.removeEventListener('visibilitychange',visibility);root.remove();}
  return {start,show,stop,destroy};
}
