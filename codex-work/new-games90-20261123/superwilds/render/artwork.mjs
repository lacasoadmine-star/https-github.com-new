/** Original vector symbols, authored for this renderer from current visual observation.
 * No provider images, screenshot frames or pre-existing game assets are embedded. */
export const SYMBOLS=Object.freeze(['orange','lemon','plum','grapes','cherry','watermelon','bell','seven','wild']);
const TAU=Math.PI*2;
function ellipse(c,x,y,rx,ry,fill,rotation=0) {c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,TAU);c.fillStyle=fill;c.fill();}
function gradient(c,stops,x=24,y=14,r=78) {const g=c.createRadialGradient(x,y,1,45,48,r);for(const [at,col] of stops)g.addColorStop(at,col);return g;}
function leaf(c,x,y,scale=1,angle=0) {c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);c.beginPath();c.moveTo(-26,0);c.bezierCurveTo(-5,-25,22,-19,30,0);c.bezierCurveTo(5,13,-15,13,-26,0);c.fillStyle=gradient(c,[[0,'#b7f45f'],[.48,'#39ad13'],[1,'#07550a']],0,-8,50);c.fill();c.strokeStyle='#d0e96b';c.lineWidth=.65;c.beginPath();c.moveTo(-23,0);c.quadraticCurveTo(0,-4,26,0);c.stroke();c.restore();}
function shine(c,x,y,rx,ry,angle=-.5) {ellipse(c,x,y,rx,ry,'rgba(255,255,255,.42)',angle);ellipse(c,x-2,y-3,rx*.34,ry*.5,'rgba(255,255,255,.6)',angle);}
function stem(c,x1,y1,x2,y2) {c.strokeStyle='#214a05';c.lineWidth=3;c.beginPath();c.moveTo(x1,y1);c.quadraticCurveTo((x1+x2)/2+8,y1-17,x2,y2);c.stroke();c.strokeStyle='#8ab62b';c.lineWidth=1;c.stroke();}

export function drawSymbol(context,key,x,y,width,height,glow=0) {
  const c=context,size=Math.min(width,height)*.92;
  c.save();c.translate(x+(width-size)/2,y+(height-size)/2);c.scale(size/100,size/100);
  if(glow){c.shadowColor='#ffe771';c.shadowBlur=12+glow*12;}
  if(key==='orange') {
    ellipse(c,50,53,37,38,gradient(c,[[0,'#ffe272'],[.34,'#ffaf16'],[.72,'#f96c00'],[1,'#b52d00']]));
    for(let i=0;i<100;i++){const a=i*2.39996,r=Math.sqrt((i+.5)/100)*32;ellipse(c,50+Math.cos(a)*r,53+Math.sin(a)*r,.45,.65,i%3?'#ffba42':'#ef6706');}
    shine(c,29,37,9,15);leaf(c,48,17,.72,.12);stem(c,57,21,65,10);
  } else if(key==='lemon') {
    c.save();c.translate(43,49);c.rotate(-.4);ellipse(c,0,0,31,39,gradient(c,[[0,'#ffff8c'],[.4,'#ffe221'],[1,'#d4a000']],-10,-17,65));ellipse(c,0,-36,7,7,'#ead11b');ellipse(c,0,36,7,7,'#d3a900');c.restore();
    ellipse(c,62,63,31,26,'#fffaaa',.45);ellipse(c,62,63,27.5,22.5,'#e9ca0c',.45);
    c.save();c.translate(62,63);c.rotate(.45);for(let i=0;i<8;i++){const a=i*TAU/8;c.beginPath();c.moveTo(0,0);c.ellipse(0,0,26,21,0,a+.07,a+TAU/8-.07);c.closePath();c.fillStyle=i%2?'#fff04f':'#f7e328';c.fill();c.strokeStyle='#fff9b5';c.lineWidth=1.1;c.stroke();}ellipse(c,0,0,3,3,'#fffbd2');c.restore();shine(c,23,31,6,14);
  } else if(key==='plum') {
    ellipse(c,49,55,30,40,gradient(c,[[0,'#aeaded'],[.25,'#555391'],[.54,'#30204e'],[.84,'#130c29'],[1,'#43274c']],29,22,80),.23);
    c.strokeStyle='rgba(172,119,217,.4)';c.lineWidth=1;c.beginPath();c.moveTo(53,20);c.quadraticCurveTo(46,50,43,88);c.stroke();shine(c,32,39,6,17,.25);leaf(c,51,15,.7,.3);stem(c,53,22,54,10);
  } else if(key==='grapes') {
    leaf(c,39,24,.95,-.25);leaf(c,69,24,.65,.3);stem(c,50,28,49,8);
    const berries=[[30,44],[48,38],[66,42],[21,58],[39,54],[57,55],[75,57],[30,72],[49,70],[66,71],[41,85],[57,84],[49,95]];
    for(const [bx,by]of berries){ellipse(c,bx,by-7,11.6,11.8,gradient(c,[[0,'#aaaef6'],[.3,'#666dbd'],[.67,'#323d84'],[1,'#141e4d']],bx-5,by-14,24));ellipse(c,bx-3,by-11,3.5,2.4,'rgba(222,228,255,.5)',-.35);}
  } else if(key==='cherry') {
    stem(c,29,60,61,13);stem(c,72,66,61,13);leaf(c,67,23,.84,.65);
    for(const [bx,by,rot]of [[28,68,-.12],[72,73,.12]]){ellipse(c,bx,by,22,24,gradient(c,[[0,'#ff7c72'],[.30,'#f92a29'],[.65,'#bd0618'],[1,'#610719']],bx-7,by-13,45),rot);shine(c,bx-8,by-9,5,8);ellipse(c,bx,by-20,5,2.5,'#6b0710');}
  } else if(key==='watermelon') {
    c.save();c.translate(50,46);c.rotate(-.25);c.beginPath();c.moveTo(-44,-8);c.lineTo(44,-8);c.bezierCurveTo(42,52,-37,51,-44,-8);c.closePath();c.fillStyle='#0a7d35';c.fill();c.beginPath();c.moveTo(-40,-8);c.lineTo(40,-8);c.bezierCurveTo(38,43,-33,44,-40,-8);c.closePath();c.fillStyle='#b6df7a';c.fill();c.beginPath();c.moveTo(-36,-8);c.lineTo(36,-8);c.bezierCurveTo(33,34,-29,36,-36,-8);c.closePath();c.fillStyle=gradient(c,[[0,'#ff9880'],[.5,'#f74b37'],[1,'#b71b25']],-15,0,65);c.fill();
    for(const [sx,sy,r]of [[-23,1,-.5],[-9,9,-.2],[6,14,.1],[23,2,.4],[-12,23,-.2],[13,26,.4]])ellipse(c,sx,sy,1.8,4,'#58231d',r);c.restore();
  } else if(key==='bell') {
    c.fillStyle=gradient(c,[[0,'#ffffca'],[.25,'#ffe777'],[.48,'#ffc934'],[.7,'#dc7b0c'],[1,'#6c3008']],28,22,90);
    c.strokeStyle='#8b480b';c.lineWidth=1.2;c.beginPath();c.moveTo(39,19);c.bezierCurveTo(13,22,30,52,13,73);c.quadraticCurveTo(9,80,16,83);c.quadraticCurveTo(50,97,85,80);c.quadraticCurveTo(89,76,82,70);c.bezierCurveTo(66,51,82,24,58,19);c.closePath();c.fill();c.stroke();ellipse(c,49,20,9,10,'#ffd54a');ellipse(c,49,16,6,5,'#ffe992');ellipse(c,49,80,32,8,'#e6a220');ellipse(c,49,80,25,5,'#6d350b');ellipse(c,49,84,8,9,'#ffce48');c.strokeStyle='#fff1a3';c.lineWidth=2.7;c.beginPath();c.moveTo(30,32);c.quadraticCurveTo(26,56,23,66);c.stroke();c.strokeStyle='#ffef91';c.lineWidth=1;c.beginPath();c.moveTo(23,69);c.quadraticCurveTo(52,79,75,68);c.stroke();
  } else if(key==='seven') {
    c.save();c.font='italic 900 102px Georgia,serif';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.strokeStyle='#693106';c.lineWidth=8;c.strokeText('7',49,56);c.strokeStyle='#ffe34e';c.lineWidth=5;c.strokeText('7',49,54);c.fillStyle=gradient(c,[[0,'#ffb699'],[.24,'#ff4735'],[.5,'#ec0d17'],[.8,'#ba0011'],[1,'#5f0014']],29,12,95);c.fillText('7',49,54);c.restore();
  } else if(key==='wild') {
    leaf(c,21,62,.9,-.7);leaf(c,80,61,.9,.5);
    c.beginPath();c.moveTo(24,34);c.lineTo(18,9);c.lineTo(37,23);c.lineTo(49,3);c.lineTo(62,22);c.lineTo(81,10);c.lineTo(76,35);c.closePath();c.fillStyle=gradient(c,[[0,'#fff5b4'],[.3,'#ffe159'],[.65,'#d99013'],[1,'#815007']],28,6,95);c.fill();c.strokeStyle='#fff1a2';c.lineWidth=1.5;c.stroke();ellipse(c,49,22,4.5,6,'#d52235');ellipse(c,29,29,3,4,'#2496dd');ellipse(c,69,28,3,4,'#3197cf');
    c.font='900 29px Georgia,serif';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.strokeStyle='#482508';c.lineWidth=7;c.strokeText('WILD',50,54);c.strokeStyle='#fff4af';c.lineWidth=3.6;c.strokeText('WILD',50,53);c.fillStyle=gradient(c,[[0,'#fff9d2'],[.3,'#fff19b'],[.6,'#ffd62a'],[1,'#b65c05']],30,34,80);c.fillText('WILD',50,53);c.strokeStyle='#dfac35';c.lineWidth=3;c.beginPath();c.moveTo(22,73);c.quadraticCurveTo(50,85,80,71);c.stroke();
  } else {
    c.strokeStyle='rgba(231,207,115,.18)';c.lineWidth=.8;c.beginPath();c.roundRect(21,13,58,74,14);c.stroke();
  }
  c.restore();
}

export function drawCloverBackground(c,w,h) {
  const g=c.createRadialGradient(w*.5,h*.5,10,w*.5,h*.5,Math.max(w,h)*.8);g.addColorStop(0,'#076440');g.addColorStop(.48,'#004d37');g.addColorStop(1,'#002b26');c.fillStyle=g;c.fillRect(0,0,w,h);
  c.save();c.fillStyle='rgba(24,142,94,.14)';
  const size=Math.max(29,w/23);
  for(let row=-1;row<h/size+1;row++)for(let col=-1;col<w/size+1;col++){
    const x=col*size+((row%2)*size/2),y=row*size,angle=((row*7+col*11)%17)*.2;
    c.save();c.translate(x,y);c.rotate(angle);for(let n=0;n<3;n++){c.rotate(TAU/3);c.beginPath();c.ellipse(0,-size*.16,size*.18,size*.26,0,0,TAU);c.fill();}c.restore();
  }
  c.restore();
}
