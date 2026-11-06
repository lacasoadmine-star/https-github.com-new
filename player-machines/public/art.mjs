import {symbolSheets} from './symbol-atlases.mjs';
// Original procedural vector artwork. Reference pixels and provider assets are never embedded.
const TAU=Math.PI*2;
function ellipse(c,x,y,rx,ry,fill,rotation=0){c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,TAU);c.fillStyle=fill;c.fill();}
function radial(c,x,y,r,light,dark){const g=c.createRadialGradient(x-r*.3,y-r*.4,r*.015,x,y,r);g.addColorStop(0,light);g.addColorStop(.26,light);g.addColorStop(.78,dark);g.addColorStop(1,'#051a18');return g;}
function shine(c,x,y,rx,ry,rotation=0,opacity=.8){c.save();c.shadowBlur=0;c.shadowColor='transparent';c.shadowOffsetY=0;c.translate(x,y);c.rotate(rotation);c.scale(rx,ry);c.globalAlpha=opacity;const f=c.createRadialGradient(0,0,0,0,0,1);f.addColorStop(0,'#fffdf6');f.addColorStop(.28,'#fffdebc9');f.addColorStop(.65,'#fffce958');f.addColorStop(1,'#fffce900');ellipse(c,0,0,1,1,f);c.restore();}
function leaf(c,x,y,scale=1,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.scale(scale,scale);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(7,-21,28,-29,44,-16);c.bezierCurveTo(28,9,10,9,0,0);c.fillStyle=radial(c,23,-7,38,'#a4e647','#20732a');c.fill();c.strokeStyle='#cee56d';c.lineWidth=.7;c.stroke();c.beginPath();c.moveTo(1,0);c.quadraticCurveTo(24,-9,42,-15);c.stroke();c.strokeStyle='#c2df6499';for(let i=8;i<36;i+=7){c.beginPath();c.moveTo(i,-i*.34);c.lineTo(i-1,-15-i*.1);c.moveTo(i,-i*.34);c.lineTo(i+7,0-i*.1);c.stroke();}c.restore();}
function gold(c,y=0){const g=c.createLinearGradient(0,y,0,y+100);for(const [a,b]of [[0,'#fffbd4'],[.16,'#ffe86c'],[.34,'#f9ae19'],[.48,'#fff9b7'],[.6,'#d39116'],[.82,'#ffe76c'],[1,'#80521b']])g.addColorStop(a,b);return g;}
function starPath(c,x,y,r,points=5){c.beginPath();for(let i=0;i<points*2;i++){const a=-Math.PI/2+i*Math.PI/points,d=i%2?r*.46:r;const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;i?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();}
function star(c,x,y,r,fill,points=5){starPath(c,x,y,r,points);c.fillStyle=fill;c.fill();c.lineWidth=3;c.strokeStyle='#ffe3a0';c.stroke();}
function fruit(c,x,y,r,light,mid,dark,angle=0,ratio=1){
 c.save();c.translate(x,y);c.rotate(angle);c.scale(r/30,r/30);const f=c.createRadialGradient(-11,-15,1,3,4,38);[[0,light],[.2,mid],[.5,mid],[.8,dark],[1,'#261919']].forEach(([p,v])=>f.addColorStop(p,v));ellipse(c,0,0,30,30*ratio,f);c.strokeStyle=dark;c.lineWidth=.7;c.stroke();
 c.save();c.beginPath();c.ellipse(0,0,29,29*ratio,0,0,TAU);c.clip();const edge=c.createLinearGradient(-30,0,30,0);edge.addColorStop(0,'#fffbc459');edge.addColorStop(.11,'#fffbc400');edge.addColorStop(.8,'#fffbc400');edge.addColorStop(1,'#ffc67066');ellipse(c,0,0,30,30*ratio,edge);c.restore();
 shine(c,-10,-15,11,7,-.35,.95);shine(c,-17,-3,4,12,-.15,.25);shine(c,18,14,5,9,-.3,.1);c.restore();
}
function citrusSlice(c,x,y,r,colour,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.scale(1,.86);ellipse(c,0,0,r,r,'#eed06c');c.shadowBlur=0;c.shadowOffsetY=0;ellipse(c,0,0,r-1.3,r-1.3,'#fff8be');ellipse(c,0,0,r-3,r-3,colour);for(let i=0;i<10;i++){const a=i*TAU/10;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*(r-4),Math.sin(a)*(r-4));c.strokeStyle='#fffac4';c.lineWidth=1;c.stroke();for(let k=0;k<3;k++){const b=a+.15+k*.1;c.beginPath();c.moveTo(Math.cos(b)*r*.28,Math.sin(b)*r*.28);c.lineTo(Math.cos(b)*r*.77,Math.sin(b)*r*.77);c.strokeStyle='#fff9b666';c.lineWidth=.4;c.stroke();}}ellipse(c,0,0,2,2,'#fff6ce');c.restore();}
function bell(c,x=50,y=52,scale=1,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.scale(scale,scale);c.strokeStyle='#e5ac25';c.lineWidth=2;c.beginPath();c.ellipse(0,-32,4,6,0,0,TAU);c.stroke();const f=c.createLinearGradient(-30,0,30,0);[[0,'#a7650c'],[.28,'#fff56a'],[.5,'#ffd02b'],[.8,'#ed9c0a'],[1,'#9b4f04']].forEach(([p,v])=>f.addColorStop(p,v));c.fillStyle=f;c.beginPath();c.moveTo(-30,20);c.bezierCurveTo(-17,5,-19,-25,-6,-29);c.quadraticCurveTo(0,-34,7,-29);c.bezierCurveTo(21,-23,17,5,31,20);c.closePath();c.fill();c.strokeStyle='#ffec8b';c.lineWidth=1;c.stroke();for(const yy of [-20,-14,10]){c.beginPath();c.ellipse(0,yy,yy<0?12:24,4,0,0,Math.PI);c.strokeStyle='#bf6c09';c.stroke();}ellipse(c,0,21,31,10,'#f5bb27');ellipse(c,0,23,27,7,'#b55b0a');ellipse(c,0,24,8,6,'#fff05d');for(let i=-23;i<=23;i+=5)ellipse(c,i,17+Math.abs(i)*.07,.9,1.3,'#9f651a');shine(c,-10,-9,5,14,.1,.8);c.restore();}
function wing(c,flip){c.save();if(flip){c.translate(100,0);c.scale(-1,1);}c.strokeStyle='#bac6eb';c.lineWidth=1;for(let i=0;i<5;i++){c.beginPath();c.moveTo(35,62);c.bezierCurveTo(12,57,3,39-i*5,10+i*4,20+i*4);c.quadraticCurveTo(18+i*4,43,38,49);c.fillStyle=i%2?'#fffaf0':'#d7d7ed';c.fill();c.stroke();}c.restore();}
function melon(c,x,y,scale,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.scale(scale,scale);c.beginPath();c.arc(0,0,38,0,Math.PI);c.closePath();c.fillStyle='#26882e';c.fill();c.strokeStyle='#84c751';c.lineWidth=1;c.stroke();c.beginPath();c.arc(0,0,34.5,0,Math.PI);c.closePath();c.fillStyle='#f0f6bc';c.fill();c.beginPath();c.arc(0,0,30.5,0,Math.PI);c.closePath();const f=c.createLinearGradient(0,0,0,35);f.addColorStop(0,'#ff6960');f.addColorStop(.4,'#ff3035');f.addColorStop(1,'#d91530');c.fillStyle=f;c.fill();for(let i=0;i<11;i++){const a=.2+i*.27,rr=i%2?15:25;ellipse(c,Math.cos(a)*rr,Math.sin(a)*rr,1.25,2.7,'#451926',a-.5);ellipse(c,Math.cos(a)*rr-.4,Math.sin(a)*rr-.3,.4,1.2,'#ffe0b388',a-.5);}c.restore();}
function plum(c,x,y,scale=1,rotation=0){
 c.save();c.translate(x,y);c.rotate(rotation);c.scale(scale,scale);const f=c.createRadialGradient(-9,-12,1,1,0,34);[[0,'#c4b8ed'],[.12,'#8b78b4'],[.28,'#584071'],[.5,'#2c1b40'],[.75,'#110f21'],[1,'#062326']].forEach(([p,v])=>f.addColorStop(p,v));
 c.beginPath();c.moveTo(-3,-29);c.bezierCurveTo(-21,-29,-26,-8,-23,10);c.bezierCurveTo(-22,31,-7,35,7,32);c.bezierCurveTo(29,29,29,2,18,-20);c.quadraticCurveTo(10,-33,-3,-29);c.fillStyle=f;c.fill();c.strokeStyle='#56607b';c.lineWidth=.6;c.stroke();
 c.save();c.beginPath();c.ellipse(0,2,23,31,0,0,TAU);c.clip();const rim=c.createLinearGradient(-25,0,25,0);rim.addColorStop(0,'#678ba5bb');rim.addColorStop(.17,'#678ba500');rim.addColorStop(.85,'#7d83b400');rim.addColorStop(1,'#748ca1aa');ellipse(c,0,3,24,32,rim);c.restore();
 c.beginPath();c.moveTo(-1,-28);c.bezierCurveTo(-10,-7,-7,15,1,31);c.strokeStyle='#050d21aa';c.lineWidth=1.3;c.stroke();c.beginPath();c.moveTo(1,-26);c.bezierCurveTo(-6,-7,-4,18,3,30);c.strokeStyle='#bd9ce655';c.lineWidth=.7;c.stroke();
 shine(c,-12,-9,5,14,-.18,.8);shine(c,-3,-21,5,4,.1,.55);shine(c,14,0,3,17,-.15,.3);c.strokeStyle='#573c23';c.lineWidth=2;c.beginPath();c.moveTo(0,-28);c.lineTo(2,-33);c.stroke();c.restore();
}
function seven(c,x,y,scale=1,forest=false){
 c.save();c.translate(x,y);c.scale(scale,scale);c.transform(1,0,-.11,1,0,0);c.lineJoin='round';
 const path=()=>{c.beginPath();if(forest){c.moveTo(-26,-33);c.bezierCurveTo(-11,-40,-1,-24,12,-31);c.lineTo(23,-35);c.quadraticCurveTo(34,-7,11,10);c.quadraticCurveTo(1,21,0,38);c.lineTo(-22,38);c.quadraticCurveTo(-22,14,-2,0);c.lineTo(9,-12);c.bezierCurveTo(-5,-7,-12,-22,-25,-14);c.closePath();return;}c.moveTo(-25,-35);c.lineTo(26,-35);c.lineTo(24,-20);c.bezierCurveTo(9,-5,3,14,0,38);c.lineTo(-22,38);c.bezierCurveTo(-17,13,-6,-7,10,-20);c.lineTo(-12,-20);c.lineTo(-15,-13);c.lineTo(-27,-13);c.closePath();};
 c.save();c.translate(1,3);path();c.fillStyle='#6b431b';c.fill();c.strokeStyle='#3e3424';c.lineWidth=6;c.stroke();c.restore();path();c.strokeStyle='#ffe49a';c.lineWidth=5;c.stroke();c.strokeStyle='#fff8c5';c.lineWidth=2;c.stroke();
 const f=c.createLinearGradient(0,-35,0,38);[[0,'#ffcccb'],[.14,'#ff4961'],[.4,'#ed093a'],[.7,'#c2042d'],[1,forest?'#f3a4ee':'#790524']].forEach(([p,v])=>f.addColorStop(p,v));c.fillStyle=f;c.fill();c.beginPath();c.moveTo(-22,-31);c.lineTo(22,-31);c.lineTo(21,-23);c.strokeStyle='#ffc6c477';c.lineWidth=1.5;c.stroke();c.restore();
}
function fox(c){c.save();leaf(c,5,64,.6,-1.3);leaf(c,76,67,.65,.6);for(const [x,y]of[[12,72],[85,75]]){for(let i=0;i<5;i++)ellipse(c,x+Math.cos(i*TAU/5)*5,y+Math.sin(i*TAU/5)*5,4,5,'#f4d6b7',i);ellipse(c,x,y,3,3,'#ffc847');}const f=c.createLinearGradient(20,10,80,82);f.addColorStop(0,'#ffd071');f.addColorStop(.35,'#f7802f');f.addColorStop(1,'#a9411d');c.fillStyle=f;c.strokeStyle='#ffd68f';c.lineWidth=1.2;c.beginPath();c.moveTo(14,5);c.quadraticCurveTo(36,9,44,25);c.lineTo(60,25);c.quadraticCurveTo(75,9,85,3);c.lineTo(87,48);c.quadraticCurveTo(83,76,51,87);c.quadraticCurveTo(17,73,12,48);c.closePath();c.fill();c.stroke();for(const side of[-1,1]){c.save();if(side===1){c.translate(100,0);c.scale(-1,1);}c.beginPath();c.moveTo(18,12);c.lineTo(23,37);c.lineTo(37,29);c.closePath();c.fillStyle='#513440';c.fill();c.beginPath();c.moveTo(14,48);c.quadraticCurveTo(33,45,51,71);c.lineTo(51,86);c.quadraticCurveTo(29,78,14,48);c.fillStyle='#fff5d8';c.fill();c.beginPath();c.moveTo(24,50);c.quadraticCurveTo(35,45,42,57);c.quadraticCurveTo(31,62,24,50);c.fillStyle='#11191b';c.fill();ellipse(c,35,52,2.4,2.8,'#f8e9c1');c.beginPath();c.moveTo(19,46);c.quadraticCurveTo(31,39,43,51);c.strokeStyle='#fff0d4';c.lineWidth=3;c.stroke();c.restore();}ellipse(c,51,74,6,4,'#191a20');shine(c,49,72,2,1);c.font='italic 900 22px Georgia';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#75472d';c.strokeText('Wild',50,96);c.fillStyle='#fff8d8';c.fillText('Wild',50,96);c.restore();}
export function drawSymbol(c,s,style='emerald'){
 c.save();c.shadowColor='#001d16bb';c.shadowBlur=4;c.shadowOffsetY=2;const forest=style==='forest';
 if(s==='orange'){if(forest){fruit(c,65,46,28,'#ffefa2','#ff9c15','#c84b06');leaf(c,59,20,.75,-.4);citrusSlice(c,35,65,27,'#ffb137',-.35);}else{fruit(c,33,58,29,'#fff7a9','#ffa00e','#c84506');fruit(c,66,59,31,'#fff7a9','#ff9b0e','#cb4309');leaf(c,43,30,.8,-.1);}}
 else if(s==='lemon'){if(forest){leaf(c,69,79,.95,-1.1);leaf(c,76,77,.7,-.7);c.save();c.translate(43,53);c.rotate(.45);const f=c.createRadialGradient(-12,-15,1,0,0,44);f.addColorStop(0,'#ffffd0');f.addColorStop(.22,'#ffff63');f.addColorStop(.56,'#ffea0b');f.addColorStop(.82,'#d3b90b');f.addColorStop(1,'#8a7908');c.beginPath();c.moveTo(-29,-14);c.quadraticCurveTo(-26,-31,0,-35);c.quadraticCurveTo(30,-35,32,-8);c.quadraticCurveTo(42,9,28,23);c.quadraticCurveTo(15,39,-8,34);c.quadraticCurveTo(-38,30,-29,-14);c.fillStyle=f;c.fill();shine(c,-13,-18,10,7,-.6);c.restore();leaf(c,63,28,.35,-.4);}else{fruit(c,27,54,27,'#fffcc6','#eed21a','#ad7b06',.2,1.18);fruit(c,51,51,30,'#ffffc8','#f1dc21','#ac8508',.15,1.1);citrusSlice(c,69,65,25,'#f5e335',-.25);}}
 else if(s==='plum'){plum(c,29,56,.99,-.15);plum(c,66,56,1.04,-.12);leaf(c,61,22,.7,.05);leaf(c,22,24,.35,-.1);}
 else if(s==='grapes'){let i=0;for(let row=0;row<5;row++)for(let j=0;j<6-row;j++){const x=18+row*7+j*12.2,y=36+row*11.6,r=7.4+(i++%3);fruit(c,x,y,r,'#d8baff',i%2?'#544191':'#67509e','#241735',.1,1.08);}leaf(c,24,23,.85,-.3);leaf(c,49,21,.85,.1);}
 else if(s==='cherry'){const list=forest?[[29,62,24],[70,64,24]]:[[19,63,13],[43,65,15],[65,68,16],[85,66,12]];c.strokeStyle='#85b341';c.lineWidth=1.6;for(const [x,y,r]of list){c.beginPath();c.moveTo(x,y-r+2);c.quadraticCurveTo(x+5,35,58,16);c.stroke();fruit(c,x,y,r,'#ffb8c0','#d70d35','#6e0629');ellipse(c,x+3,y-r+2,4,1.6,'#5c142b');}leaf(c,50,18,.68,.1);}
 else if(s==='watermelon'){if(forest){melon(c,45,47,1.05,-.65);melon(c,64,53,.68,-1.1);leaf(c,69,41,.35,.4);}else{melon(c,41,42,.91,-.55);melon(c,63,47,.9,-.4);}}
 else if(s==='777'){if(forest)seven(c,50,51,1,true);else{seven(c,28,51,.86);seven(c,72,51,.86);}}
 else if(s==='dollar'){const text='$$';c.translate(50,52);c.transform(1,0,-.11,1,0,0);c.textAlign='center';c.textBaseline='middle';c.font=`900 ${s==='dollar'?73:87}px Georgia`;c.lineJoin='round';c.lineWidth=6;c.strokeStyle='#693c21';c.strokeText(text,1,4,92);c.strokeStyle='#fff8c3';c.lineWidth=3;c.strokeText(text,0,0,92);const f=c.createLinearGradient(0,-38,0,40);[[0,s==='dollar'?'#fff89c':'#ffb6c0'],[.35,s==='dollar'?'#ffe82d':'#ff3055'],[.55,s==='dollar'?'#fffda1':'#da1041'],[1,s==='dollar'?'#eba523':'#8e0a30']].forEach(([p,v])=>f.addColorStop(p,v));c.fillStyle=f;c.fillText(text,0,0,92);}
 else if(s==='golden_bell'){bell(c,31,54,.87,.2);bell(c,68,54,.87,-.14);}
 else if(s==='winged_bell'){wing(c,false);wing(c,true);bell(c,51,54,.95,.32);for(const [x,y,r]of[[22,21,2],[70,16,2],[87,45,2.5],[18,73,1.7]]){ellipse(c,x,y,r,r,'#ef99de');shine(c,x-.4,y-.4,r,r,0,.7);}}
 else if(s==='fox')fox(c);
 else if(s==='big_star'){star(c,50,52,43,'#ac6936');star(c,50,52,38,'#caa6ff');starPath(c,50,52,34);c.save();c.clip();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,b=a+Math.PI/5;c.beginPath();c.moveTo(50,52);c.lineTo(50+Math.cos(a)*48,52+Math.sin(a)*48);c.lineTo(50+Math.cos(b)*48,52+Math.sin(b)*48);c.closePath();c.fillStyle=['#d7b9ff','#6340c2','#a77be9','#5532bd'][i%4];c.fill();}c.restore();shine(c,37,32,13,4,-.6,.8);}
 else if(s==='scatter'){star(c,50,43,35,gold(c,5));c.font='900 14px Georgia';c.textAlign='center';c.fillStyle='#fff7b9';c.fillText('SCATTER',50,93);}
 else {c.restore();throw Error('UNKNOWN_SYMBOL_'+s);}c.restore();
}
export function makeAtlas(g){
 const atlas=new Map();for(const name of g.symbols){const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;const c=canvas.getContext('2d');c.scale(3.2,3.2);drawSymbol(c,name,g.visual.skin);atlas.set(name,canvas);}
 atlas.artworkLoaded=false;const sheet=symbolSheets[g.id];
 atlas.ready=!sheet||typeof Image==='undefined'?Promise.resolve(false):new Promise(resolve=>{
  const image=new Image();image.onload=()=>{
   if(image.width!==sheet.tile*sheet.columns||image.height!==sheet.tile*3){resolve(false);return;}
   for(const [i,name]of sheet.symbols.entries()){const canvas=atlas.get(name);if(!canvas)continue;const c=canvas.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(image,(i%sheet.columns)*sheet.tile,Math.floor(i/sheet.columns)*sheet.tile,sheet.tile,sheet.tile,0,0,canvas.width,canvas.height);}
   atlas.artworkLoaded=true;resolve(true);
  };image.onerror=()=>resolve(false);image.src=sheet.url;
 });return atlas;
}
function clover(c,x,y,size,angle,colour,soft=false){
 c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);c.shadowColor=soft?'#00281b50':'#001e19b8';c.shadowBlur=soft?1:3;c.shadowOffsetY=soft?.6:1.4;
 if(soft)c.globalAlpha*=.35;
 const stem=c.createLinearGradient(0,0,-4,43);stem.addColorStop(0,'#0a5e45');stem.addColorStop(.65,'#16785a');stem.addColorStop(1,'#064a38');c.beginPath();c.moveTo(0,-1);c.bezierCurveTo(1,15,11,30,-5,43);c.strokeStyle=stem;c.lineWidth=2.1;c.lineCap='round';c.stroke();if(soft)c.globalAlpha/=.35;
 for(let i=0;i<3;i++){
  c.save();c.rotate(i*TAU/3+(i-1)*.08);c.scale(1-i*.025,1+(i-1)*.04);
  c.beginPath();c.moveTo(0,1);c.bezierCurveTo(-17,-5,-32,-21,-25,-34);c.bezierCurveTo(-19,-46,-5,-42,0,-31);c.bezierCurveTo(7,-46,23,-42,27,-31);c.bezierCurveTo(33,-17,15,-5,0,1);c.closePath();
  const f=c.createLinearGradient(-25,-36,19,8);f.addColorStop(0,colour);f.addColorStop(.35,colour);f.addColorStop(.7,soft?colour:'#075740');f.addColorStop(1,soft?'#034a32':'#013a2d');c.fillStyle=f;c.fill();c.shadowBlur=0;
  c.save();c.clip();const fold=c.createLinearGradient(-8,-25,11,-14);fold.addColorStop(0,'#063c2a00');fold.addColorStop(.4,'#002e2510');fold.addColorStop(.52,'#001e2024');fold.addColorStop(.63,'#2b9a7320');fold.addColorStop(1,'#2b9a7300');c.fillStyle=fold;c.fillRect(-35,-48,70,54);
  const light=c.createRadialGradient(-12,-32,1,-12,-29,29);light.addColorStop(0,'#3eb68a24');light.addColorStop(1,'#3eb68a00');c.fillStyle=light;c.fillRect(-35,-48,70,54);c.restore();
  c.beginPath();c.moveTo(-1,0);c.quadraticCurveTo(-4,-14,0,-31);c.strokeStyle='#49b38a26';c.lineWidth=.6;c.stroke();
  c.beginPath();c.moveTo(-23,-34);c.bezierCurveTo(-19,-42,-8,-40,-3,-34);c.strokeStyle='#53b18a22';c.lineWidth=.65;c.stroke();c.restore();
 }c.restore();
}
function tropical(c,x,y,size,angle,colour){
 c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);
 c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-25,-6,-40,-23,-34,-40);c.lineTo(-18,-32);c.quadraticCurveTo(-34,-50,-29,-61);c.lineTo(-12,-48);c.quadraticCurveTo(-26,-76,-11,-87);c.lineTo(2,-73);c.quadraticCurveTo(21,-96,29,-81);c.quadraticCurveTo(43,-67,34,-55);c.lineTo(18,-46);c.quadraticCurveTo(42,-48,39,-31);c.lineTo(18,-27);c.quadraticCurveTo(31,-12,0,0);c.closePath();
 const f=c.createLinearGradient(-34,-40,40,-20);f.addColorStop(0,'#0b4a40');f.addColorStop(.45,colour);f.addColorStop(.53,'#236b5d');f.addColorStop(1,'#073d35');c.fillStyle=f;c.fill();c.strokeStyle='#5fb3a170';c.lineWidth=1;c.stroke();
 c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(5,-38,1,-73);c.strokeStyle='#69c0a252';c.lineWidth=1.2;c.stroke();for(let i=0;i<4;i++){c.beginPath();c.moveTo(2,-14-i*16);c.quadraticCurveTo(-10,-16-i*17,-24,-26-i*15);c.moveTo(2,-14-i*16);c.quadraticCurveTo(13,-15-i*17,28,-28-i*15);c.strokeStyle='#389a7c35';c.lineWidth=.5;c.stroke();}c.restore();
}
export function drawBackground(c,g){
 const forest=g.visual.skin==='forest',grad=c.createLinearGradient(0,0,0,900);grad.addColorStop(0,forest?'#001e18':'#00271e');grad.addColorStop(.52,forest?'#00382c':'#00442f');grad.addColorStop(1,forest?'#00241e':'#003225');c.fillStyle='#000';c.fillRect(0,0,420,900);c.save();if(forest){c.beginPath();c.rect(13,0,394,900);c.clip();}c.fillStyle=grad;c.fillRect(0,0,420,900);
 let seed=forest?117:59;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 if(!forest&&g.id==='multi_hot_5_video'){
  // The reference field has broad, softly lit shamrocks, with open dark
  // pockets between clusters, rather than hundreds of small glossy leaves.
  for(let i=0;i<82;i++){
   const x=random()*480-30,y=random()*1000-40,size=.7+random()*.58;
   c.globalAlpha=.3+random()*.3;
   clover(c,x,y,size,random()*TAU,['#00603e','#075b3c','#004d33','#006945'][i%4],true);
  }
  for(let i=0;i<49;i++){
   const x=random()*470-25,y=435+random()*510,size=.67+random()*.48;
   c.globalAlpha=.57+random()*.3;
   clover(c,x,y,size,random()*TAU,['#00754d','#00613e','#075b39','#007d53','#086542'][i%5],true);
  }
  c.globalAlpha=1;const shade=c.createLinearGradient(0,0,0,450);
  shade.addColorStop(0,'#00170cce');shade.addColorStop(.7,'#00180f20');shade.addColorStop(1,'#00120f00');c.fillStyle=shade;c.fillRect(0,0,420,900);
 }else if(!forest){
  for(let i=0;i<220;i++){const x=random()*470-25,y=random()*950-25,size=.45+random()*.45;c.globalAlpha=.36+random()*.3;clover(c,x,y,size,random()*TAU,['#005e46','#096b4c','#065c42','#086b50'][i%4]);}
  // Overlapping irregular groups preserve the dense shamrock field without a tile grid.
  for(let i=0;i<104;i++){const cluster=i%7,x=cluster*69-13+(random()-.5)*74,y=445+random()*480;c.globalAlpha=.62+random()*.28;clover(c,x,y,.4+random()*.4,random()*TAU,['#087a56','#0b7352','#086447','#007257','#0a694b'][i%5]);}
  c.globalAlpha=1;const shade=c.createLinearGradient(0,0,0,440);shade.addColorStop(0,'#00170cce');shade.addColorStop(.7,'#00180f20');shade.addColorStop(1,'#00120f00');c.fillStyle=shade;c.fillRect(0,0,420,900);
 }else{
  for(let i=0;i<27;i++){c.globalAlpha=.05+random()*.11;tropical(c,random()*480-30,random()*900,1+random()*.5,random()*TAU,'#145346');}c.globalAlpha=1;
  for(const side of[0,1]){c.save();if(side){c.translate(420,0);c.scale(-1,1);}for(const [y,angle,scale]of[[26,-.7,1.4],[434,-1.5,.9],[690,-1.1,1.1],[782,-.65,1.3],[884,-.9,1.2]])tropical(c,side?-8:7,y+(side?55:0),scale,angle,side?'#2d8c79':'#277f6c');
   if(side)c.translate(0,110);c.beginPath();c.moveTo(-25,493);c.bezierCurveTo(10,474,19,512,38,521);c.bezierCurveTo(62,542,72,507,95,513);c.strokeStyle='#12483e';c.lineWidth=15;c.stroke();c.strokeStyle='#3f9d87';c.lineWidth=9;c.stroke();c.strokeStyle='#73c2a5';c.lineWidth=2;c.stroke();leaf(c,83,517,.45,-1.8);leaf(c,90,521,.45,.8);leaf(c,36,520,.3,2.6);c.restore();}
  for(let i=0;i<6;i++)tropical(c,56+i*67,32+i%2*20,1.1,-.45+i*.14,'#185147');
 }
 const vignette=c.createRadialGradient(210,430,150,210,430,680);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#0008');c.fillStyle=vignette;c.fillRect(0,0,420,900);c.restore();
}
export {gold,leaf,star,tropical};
