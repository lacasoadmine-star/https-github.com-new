// Original vector artwork, rendered into a DPR-aware atlas. No reference video pixels.
const TAU=Math.PI*2;
function ellipse(c,x,y,rx,ry,fill,rotation=0){c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,TAU);c.fillStyle=fill;c.fill();}
function radial(c,x,y,r,light,dark){const g=c.createRadialGradient(x-r*.3,y-r*.4,r*.05,x,y,r);g.addColorStop(0,light);g.addColorStop(.48,light);g.addColorStop(1,dark);return g;}
function leaf(c,x,y,scale=1,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.scale(scale,scale);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(5,-23,33,-25,41,-16);c.bezierCurveTo(29,5,8,8,0,0);c.fillStyle=radial(c,20,-10,25,'#9cea37','#126918');c.fill();c.strokeStyle='#d0e550';c.lineWidth=1.1;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(20,-12,37,-16);c.stroke();c.restore();}
function gloss(c,x,y,rx,ry,rotation=0){c.save();c.globalAlpha=.7;ellipse(c,x,y,rx,ry,'#fffbd9',rotation);c.restore();}
function star(c,x,y,r,fill,points=5){c.beginPath();for(let i=0;i<points*2;i++){const a=-Math.PI/2+i*Math.PI/points,d=i%2?r*.44:r;const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;i?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();c.fillStyle=fill;c.fill();c.lineWidth=3;c.strokeStyle='#ffe3a0';c.stroke();}
function gold(c,y=0){const g=c.createLinearGradient(0,y,0,y+100);for(const [a,b]of [[0,'#fff5aa'],[.22,'#ffdb48'],[.44,'#fff9be'],[.55,'#b87716'],[.8,'#f6b823'],[1,'#764413']])g.addColorStop(a,b);return g;}
function bell(c,x=50,y=52,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);c.fillStyle=gold(c,-40);c.strokeStyle='#8e5508';c.lineWidth=2;ellipse(c,0,25,8,6,'#cb8510');c.beginPath();c.moveTo(-28,18);c.bezierCurveTo(-13,5,-23,-24,-5,-28);c.lineTo(-5,-33);c.quadraticCurveTo(0,-40,5,-33);c.lineTo(5,-28);c.bezierCurveTo(23,-24,13,5,28,18);c.quadraticCurveTo(0,31,-28,18);c.closePath();c.fill();c.stroke();ellipse(c,0,19,28,7,gold(c,-35));c.stroke();gloss(c,-10,-10,4,15,.2);c.restore();}
function wing(c,flip){c.save();if(flip){c.translate(100,0);c.scale(-1,1);}c.fillStyle='#e8f4c9';c.strokeStyle='#b8d3a8';c.lineWidth=1.2;for(let i=0;i<5;i++){c.beginPath();c.moveTo(32,61);c.quadraticCurveTo(6,40-i*6,9+i*6,17+i*4);c.quadraticCurveTo(20+i*5,45,41,51);c.fill();c.stroke();}c.restore();}
export function drawSymbol(c,s,style='emerald'){
 c.save();c.shadowColor='#0009';c.shadowBlur=3;c.shadowOffsetY=3;
 if(s==='orange'){ellipse(c,52,56,34,34,radial(c,48,50,40,'#ffba14','#ce3b03'));gloss(c,32,40,9,4,-.7);leaf(c,52,24,.7,-.2);}
 else if(s==='lemon'){c.save();c.translate(50,52);c.rotate(-.5);c.beginPath();c.moveTo(-40,0);c.bezierCurveTo(-29,-5,-31,-30,0,-31);c.bezierCurveTo(29,-31,27,-5,40,0);c.bezierCurveTo(28,9,29,29,0,31);c.bezierCurveTo(-28,32,-26,8,-40,0);c.fillStyle=radial(c,-2,0,40,'#fff735','#d9a606');c.fill();gloss(c,-8,-17,18,5);c.restore();leaf(c,70,26,.5,-.1);}
 else if(s==='plum'){ellipse(c,37,57,23,32,radial(c,31,48,32,'#a063d5','#180929'),-.2);ellipse(c,64,57,23,32,radial(c,55,47,34,'#7e3da7','#130c29'),.16);gloss(c,30,43,4,12,.2);gloss(c,57,41,4,12,.2);leaf(c,49,26,.75,-.2);}
 else if(s==='grapes'){for(let r=0;r<4;r++)for(let j=0;j<5-r;j++){const x=25+r*8+j*14,y=38+r*15;ellipse(c,x,y,10,11,radial(c,x-3,y-4,14,'#ae89ee','#352278'));gloss(c,x-3,y-4,2,2);}leaf(c,42,21,.9,.05);}
 else if(s==='cherry'){c.lineWidth=4;c.strokeStyle='#66ac20';c.beginPath();c.moveTo(32,63);c.bezierCurveTo(38,31,54,29,56,12);c.bezierCurveTo(65,36,66,42,74,57);c.stroke();ellipse(c,31,67,23,24,radial(c,24,58,32,'#f93c61','#8b0524'));ellipse(c,72,66,22,25,radial(c,62,55,32,'#f7354b','#9a0018'));gloss(c,22,56,7,4,-.6);gloss(c,66,53,6,3);leaf(c,55,20,.55,.25);}
 else if(s==='watermelon'){c.save();c.translate(50,45);c.rotate(-.3);c.beginPath();c.arc(0,0,43,0,Math.PI);c.closePath();c.fillStyle='#258c25';c.fill();c.beginPath();c.arc(0,0,38,0,Math.PI);c.closePath();c.fillStyle='#d8efa0';c.fill();c.beginPath();c.arc(0,0,33,0,Math.PI);c.closePath();c.fillStyle=radial(c,-10,6,48,'#ff4e49','#c51535');c.fill();for(let i=0;i<8;i++){const a=.26+i*.37;ellipse(c,Math.cos(a)*24,Math.sin(a)*24,1.7,3,'#421322',a-.8);}c.restore();}
 else if(s==='777'){c.font='italic 900 83px Georgia';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=6;c.strokeStyle='#fff7ac';c.strokeText(style==='emerald'?'77':'7',50,56,92);const seven=c.createLinearGradient(0,15,0,87);seven.addColorStop(0,'#ff6669');seven.addColorStop(.5,'#ee0b39');seven.addColorStop(1,'#8e0930');c.fillStyle=seven;c.fillText(style==='emerald'?'77':'7',50,56,92);}
 else if(s==='dollar'){c.font='900 78px Georgia';c.textAlign='center';c.textBaseline='middle';c.lineWidth=3;c.strokeStyle='#8f6510';c.fillStyle=gold(c,10);c.strokeText('$$',50,56,94);c.fillText('$$',50,56,94);}
 else if(s==='golden_bell'){bell(c,41,56,.85);bell(c,67,51,.77);}
 else if(s==='winged_bell'){wing(c,false);wing(c,true);bell(c,50,58,.9);}
 else if(s==='fox'){c.fillStyle='#f7771a';c.strokeStyle='#ffdf68';c.lineWidth=2;c.beginPath();c.moveTo(12,9);c.lineTo(45,27);c.lineTo(62,23);c.lineTo(86,8);c.lineTo(87,58);c.quadraticCurveTo(67,91,51,94);c.quadraticCurveTo(18,78,12,56);c.closePath();c.fill();c.stroke();c.fillStyle='#ffeccb';c.beginPath();c.moveTo(15,45);c.quadraticCurveTo(39,49,51,74);c.quadraticCurveTo(66,48,86,43);c.quadraticCurveTo(73,86,51,94);c.quadraticCurveTo(26,84,15,45);c.fill();ellipse(c,31,48,5,4,'#131b1b',.15);ellipse(c,70,47,5,4,'#131b1b',-.15);ellipse(c,51,77,7,5,'#20201b');c.font='900 17px Georgia';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#452217';c.strokeText('WILD',50,94);c.fillStyle='#ffe99e';c.fillText('WILD',50,94);}
 else if(s==='big_star'){star(c,50,52,42,radial(c,39,35,50,'#ceb5ff','#52249b'));star(c,50,52,26,radial(c,45,42,35,'#e3caff','#7d55ce'));}
 else if(s==='scatter'){star(c,50,45,35,gold(c,5));c.font='bold 15px Georgia';c.textAlign='center';c.fillStyle='#fff7b9';c.fillText('SCATTER',50,93);}
 else {c.restore();throw Error('UNKNOWN_SYMBOL_'+s);}
 c.restore();
}
export function makeAtlas(g){const atlas=new Map();for(const name of g.symbols){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d');c.scale(2.56,2.56);drawSymbol(c,name,g.visual.skin);atlas.set(name,canvas);}return atlas;}
export function drawBackground(c,g){
 const f=g.visual.skin==='forest';const grad=c.createLinearGradient(0,0,420,900);grad.addColorStop(0,f?'#04231d':'#00382a');grad.addColorStop(.45,'#014833');grad.addColorStop(1,f?'#002c26':'#035b3c');c.fillStyle=grad;c.fillRect(0,0,420,900);
 // Deterministic decorative foliage; independent from reels, never an outcome source.
 let seed=f?117:59;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<180;i++){const x=random()*500-40,y=random()*970-20,size=.4+random()*(f?1.8:.8);c.save();c.globalAlpha=f?.09+.16*random():.08+.09*random();leaf(c,x,y,size,random()*TAU);c.restore();}
 if(f){for(let edge=0;edge<2;edge++){c.save();if(edge){c.translate(420,0);c.scale(-1,1);}c.strokeStyle='#11584a';c.lineWidth=15;c.beginPath();c.moveTo(-16,5);c.bezierCurveTo(47,170,-20,280,14,420);c.bezierCurveTo(56,540,-4,630,5,865);c.stroke();for(let j=0;j<7;j++){c.save();c.globalAlpha=.85;leaf(c,-8,70+j*120,1.2,(j%2)*.6);c.restore();}c.restore();}}
 const vignette=c.createRadialGradient(210,340,80,210,440,570);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#0009');c.fillStyle=vignette;c.fillRect(0,0,420,900);
}
export {gold,leaf,star};
