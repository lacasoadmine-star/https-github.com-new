// Resolution-independent cabinet surfaces. These paths are drawn by code; no captured imagery.
export function metalText(c,text,x,y,size,width,{pink=false,italic=false}={}){
 c.save();c.translate(x,y);if(italic)c.transform(1,0,-.12,1,0,0);c.font=`900 ${size}px Arial, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
 const measured=c.measureText(text).width;c.scale(width?width/measured:1,1);
 c.shadowColor=pink?'#ff2b7e99':'#50bf8277';c.shadowBlur=5;c.strokeStyle=pink?'#2e1725':'#183d26';c.lineWidth=5;c.strokeText(text,0,1);
 c.shadowBlur=0;c.strokeStyle=pink?'#701131':'#754313';c.lineWidth=3.8;c.strokeText(text,0,2.5);
 c.strokeStyle=pink?'#ffa1ce':'#ffec9b';c.lineWidth=2.2;c.strokeText(text,0,-.3);
 const f=c.createLinearGradient(0,-size*.5,0,size*.5);[[0,pink?'#ffd1e9':'#fffdd7'],[.24,pink?'#ff73ab':'#fff17f'],[.47,pink?'#ec2977':'#ffc731'],[.52,pink?'#b61a54':'#ad6a13'],[.68,pink?'#e33987':'#f3bb33'],[1,pink?'#751331':'#ba781d']].forEach(([a,b])=>f.addColorStop(a,b));c.fillStyle=f;c.fillText(text,0,0);c.restore();
}
export function foilFrame(c,x,y,w,h,r,forest=false){
 c.save();c.lineJoin='round';
 const layers=forest?[[-3,2,'#003b2b'],[-1.4,3.6,'#167b5b'],[-.5,1.1,'#a4e7a2'],[.8,1.8,'#034b39'],[2.2,1.2,'#91ae37'],[3.1,.65,'#dae279']]:[[-1.2,1.2,'#002b20'],[-.2,2.1,'#957238'],[0,1.2,'#f2df91'],[1.1,.85,'#765b2d'],[1.9,.6,'#517546']];
 for(const [inset,line,color]of layers){
  c.beginPath();c.roundRect(x+inset,y+inset,w-inset*2,h-inset*2,r);c.strokeStyle=color;c.lineWidth=line;c.stroke();
 }
 c.restore();
}
export function texture(c,x,y,w,h,alpha=.08){
 c.save();c.globalAlpha=alpha;c.fillStyle='#b2eec7';
 for(let yy=y+2;yy<y+h;yy+=5)for(let xx=x+2+(Math.floor(yy/5)%2)*2.5;xx<x+w;xx+=5){c.fillRect(xx,yy,.7,.7);}
 c.restore();
}
export function reelSurface(g){
 const v=g.visual,w=v.w/g.reels,forest=g.id==='hot_foxy_20',canvas=document.createElement('canvas');canvas.width=Math.ceil(w*2);canvas.height=Math.ceil(v.h*2);const c=canvas.getContext('2d');c.scale(2,2);
 const grd=c.createLinearGradient(0,0,w,0);grd.addColorStop(0,forest?'#145b45':'#021e1c');grd.addColorStop(.35,forest?'#177c64':'#032c24');grd.addColorStop(.75,forest?'#17816c':'#022920');grd.addColorStop(1,forest?'#155b47':'#031b19');c.fillStyle=grd;c.fillRect(0,0,w,v.h);if(forest){c.fillStyle='#b9c950';c.globalAlpha=.29;for(let y=2;y<v.h;y+=3.2)for(let x=1+(Math.floor(y/3.2)%2)*1.6;x<w;x+=3.2){c.beginPath();c.arc(x,y,.69,0,Math.PI*2);c.fill();}c.globalAlpha=1;}return canvas;
}
export function foxyLogo(c){
 c.save();c.translate(70,29);c.rotate(-.11);c.lineCap='round';c.lineJoin='round';
 const glyphs=[p=>{p.moveTo(9,27);p.bezierCurveTo(13,13,12,-1,18,-12);p.bezierCurveTo(32,-17,43,-14,47,-17);p.moveTo(10,6);p.quadraticCurveTo(23,2,34,3);},p=>{p.moveTo(46,9);p.bezierCurveTo(30,-3,23,29,39,29);p.bezierCurveTo(48,28,53,8,46,9);},p=>{p.moveTo(58,6);p.bezierCurveTo(59,13,65,29,70,28);p.moveTo(73,8);p.quadraticCurveTo(62,19,54,28);},p=>{p.moveTo(83,8);p.bezierCurveTo(76,30,90,34,98,10);p.moveTo(100,8);p.bezierCurveTo(94,31,96,43,81,47);p.quadraticCurveTo(73,48,72,43);}];
 for(const [width,color,offset]of [[13,'#0d4a39',2],[10,'#74a96b',0],[7,'#fff4b2',0],[3,'#e4d478',1]]){c.lineWidth=width;c.strokeStyle=color;for(const glyph of glyphs){c.save();c.translate(0,offset);c.beginPath();glyph(c);c.stroke();c.restore();}}
 c.restore();
}
