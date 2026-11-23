import {BURN_WILDS_GAME_ID,BURN_WILDS_SYMBOLS} from './expansion.mjs';

/**
 * Entirely authored ZPLAY Canvas artwork for the Burn Wilds symbol set.
 * No downloaded provider sprite, atlas, font, sound, screenshot or logo.
 * These symbols can replace unlicensed placeholders but are not represented
 * as visually identical to any third-party game.
 */
const fail=code=>{throw new TypeError('BURN_WILDS_OWN_ART_'+code);};
const palette=Object.freeze({
 orange:['#ffcc52','#ff7a14','#9c310a'],
 lemon:['#fff28b','#f9da35','#ac8107'],
 plum:['#e09bff','#7531be','#320756'],
 grapes:['#c885fa','#7235b6','#381257'],
 cherry:['#ff999a','#dc2b41','#670d27'],
 watermelon:['#eaffb4','#57c53b','#165b23'],
 bell:['#fff3ac','#dba12e','#744a09'],
 seven:['#ffc9ae','#e43d20','#850c0b'],
 wild:['#ffffa3','#ffab24','#93191c']
});
function path(ctx,points,close=true){
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(const [x,y]of points.slice(1))ctx.lineTo(x,y);
  if(close)ctx.closePath();
}
function ellipse(ctx,x,y,rx,ry,fill,stroke,width=3,angle=0){
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,Math.PI*2);
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}
}
function blossom(ctx,x,y,size){
  for(let k=0;k<4;k++){
    const a=k*Math.PI/2;ellipse(ctx,x+Math.cos(a)*size*.5,y+Math.sin(a)*size*.5,size*.41,size*.23,'#70d84d','#235323',1.5,a);
  }
}
function leaf(ctx,x,y,scale,angle=0){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  ellipse(ctx,0,0,19*scale,9*scale,'#53dd58','#165d23',2,-.4);
  ctx.strokeStyle='#baef9a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-17*scale,5*scale);ctx.lineTo(16*scale,-5*scale);ctx.stroke();ctx.restore();
}
function shine(ctx,x,y,size=1){
  ellipse(ctx,x,y,9*size,4*size,'rgba(255,255,255,.72)',null,0,-.65);
  ellipse(ctx,x+13*size,y-9*size,3*size,3*size,'rgba(255,255,255,.45)');
}
function glyph(ctx,text,fill,stroke='#53220c',size=79){
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  ctx.font='900 '+size+'px Georgia,serif';ctx.lineWidth=9;ctx.strokeStyle=stroke;
  ctx.strokeText(text,64,69);ctx.fillStyle=fill;ctx.fillText(text,64,69);
  ctx.lineWidth=2;ctx.strokeStyle='rgba(255,245,165,.85)';ctx.strokeText(text,64,69);
}
function icon(ctx,symbol){
  ctx.save();
  const shades=palette[symbol];const g=ctx.createLinearGradient(22,21,102,112);
  g.addColorStop(0,shades[0]);g.addColorStop(.46,shades[1]);g.addColorStop(1,shades[2]);
  if(symbol==='orange'){
    ellipse(ctx,64,71,41,41,g,'#8c4809',3);leaf(ctx,77,30,.8,-.5);
    ellipse(ctx,56,42,16,5,'rgba(255,255,255,.32)');shine(ctx,40,53,1.1);
    for(let k=0;k<8;k++)ellipse(ctx,64+Math.cos(k)*22,71+Math.sin(k)*22,1.1,1.1,'#cc650b');
  }else if(symbol==='lemon'){
    ctx.save();ctx.translate(64,70);ctx.rotate(-.45);
    ellipse(ctx,0,0,44,31,g,'#b18810',3);
    path(ctx,[[-37,-15],[-50,0],[-37,16]]);ctx.fillStyle=shades[1];ctx.fill();ctx.restore();
    leaf(ctx,88,32,.76,-.2);shine(ctx,39,54);
  }else if(symbol==='plum'){
    ellipse(ctx,64,73,39,42,g,'#371047',3);leaf(ctx,75,32,.84,-.5);
    shine(ctx,45,53,1.2);
  }else if(symbol==='grapes'){
    const spheres=[[55,45],[77,45],[43,64],[64,63],[87,65],[52,83],[75,84],[64,101]];
    spheres.forEach(([x,y],i)=>{ellipse(ctx,x,y,17,18,g,'#40165b',2);shine(ctx,x-5,y-8,.6);});
    path(ctx,[[64,28],[67,40]],false);ctx.strokeStyle='#528b2c';ctx.lineWidth=4;ctx.stroke();leaf(ctx,73,29,.72,-.8);
  }else if(symbol==='cherry'){
    for(const [x,y]of [[48,77],[83,81]]){
      ellipse(ctx,x,y,24,25,g,'#850a27',3);shine(ctx,x-8,y-9,.8);
      ctx.beginPath();ctx.moveTo(x,y-22);ctx.quadraticCurveTo(64,35,65,24);ctx.strokeStyle='#4cbb35';ctx.lineWidth=4;ctx.stroke();
    }
    leaf(ctx,79,27,.8,-.15);
  }else if(symbol==='watermelon'){
    path(ctx,[[23,63],[106,63],[64,105]]);
    ctx.fillStyle='#258c30';ctx.strokeStyle='#165a25';ctx.lineWidth=5;ctx.fill();ctx.stroke();
    path(ctx,[[29,65],[100,65],[64,99]]);ctx.fillStyle='#ed3852';ctx.fill();
    for(const [x,y]of [[48,73],[70,75],[61,89],[83,71]]){
      ellipse(ctx,x,y,2.4,5,'#4a1c21',null,0,-.15);
    }
    ctx.beginPath();ctx.moveTo(24,64);ctx.lineTo(105,64);ctx.strokeStyle='#daef9b';ctx.lineWidth=5;ctx.stroke();
  }else if(symbol==='bell'){
    path(ctx,[[54,32],[76,32],[81,44],[86,80],[99,88],[29,88],[42,80],[47,44]]);
    ctx.fillStyle=g;ctx.lineWidth=4;ctx.strokeStyle='#7a520d';ctx.fill();ctx.stroke();
    ellipse(ctx,64,95,13,8,'#e3ac37','#82430b',3);ellipse(ctx,64,30,12,7,'#ffe183','#865a0e',3);
    shine(ctx,51,59,1.2);
  }else if(symbol==='seven'){
    glyph(ctx,'7',g,'#601512',90);
    ctx.save();ctx.strokeStyle='#fff4b4';ctx.lineWidth=4;ctx.beginPath();
    ctx.moveTo(30,30);ctx.lineTo(42,21);ctx.lineTo(54,30);ctx.stroke();ctx.restore();
  }else if(symbol==='wild'){
    ctx.save();path(ctx,[[65,14],[81,48],[94,32],[93,75],[78,101],[50,107],[34,89],[34,51],[49,66]]);
    ctx.fillStyle=g;ctx.strokeStyle='#a32912';ctx.lineWidth=3;ctx.fill();ctx.stroke();
    path(ctx,[[61,53],[74,73],[68,99],[52,94],[48,75]]);ctx.fillStyle='#ffe86b';ctx.fill();
    ctx.restore();
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 23px Arial,sans-serif';
    ctx.lineWidth=5;ctx.strokeStyle='#632814';ctx.strokeText('WILD',64,82);
    ctx.fillStyle='#fff7cd';ctx.fillText('WILD',64,82);
  }
  ctx.restore();
}
function buildSymbol(ctx,symbol,size){
  const s=size/128;ctx.setTransform(s,0,0,s,0,0);ctx.clearRect(0,0,128,128);
  const ground=ctx.createRadialGradient(52,32,9,64,70,87);
  ground.addColorStop(0,'#1b6854');ground.addColorStop(.75,'#064035');ground.addColorStop(1,'#00231f');
  ctx.fillStyle=ground;ctx.fillRect(0,0,128,128);
  const ring=ctx.createLinearGradient(0,0,128,128);
  ring.addColorStop(0,'#e8d68a');ring.addColorStop(.5,'#795d24');ring.addColorStop(1,'#ecda97');
  ctx.lineWidth=4;ctx.strokeStyle=ring;ctx.strokeRect(3,3,122,122);
  icon(ctx,symbol);
  const fade=ctx.createLinearGradient(0,0,0,128);
  fade.addColorStop(0,'rgba(255,255,255,.12)');fade.addColorStop(.5,'rgba(255,255,255,0)');
  ctx.fillStyle=fade;ctx.fillRect(7,7,114,44);
}
/** Built at mount time by the Player's existing document; no remote request. */
export function createBurnWildsOwnArtwork({doc,size=256}={}){
  if(!doc?.createElement||!Number.isInteger(size)||size<128||size>512)
    fail('CANVAS_FACTORY_REQUIRED');
  const symbols={};
  for(const symbol of BURN_WILDS_SYMBOLS){
    const canvas=doc.createElement('canvas');
    if(!canvas?.getContext)fail('CANVAS_MISSING');
    canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d');
    if(!ctx||typeof ctx.ellipse!=='function')fail('2D_UNAVAILABLE');
    buildSymbol(ctx,symbol,size);
    symbols[symbol]=canvas;
  }
  return Object.freeze({
    gameId:BURN_WILDS_GAME_ID,
    symbols:Object.freeze(symbols),
    source:'ZPLAY_ORIGINAL_CANVAS_V1',
    thirdPartyAssets:false,providerParityVerified:false
  });
}
