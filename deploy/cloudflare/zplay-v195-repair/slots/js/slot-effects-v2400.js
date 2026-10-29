
/* Superwin 2400 visual-only animation; results and wallets remain server-controlled. */
(()=>{'use strict';
const id=new URLSearchParams(location.search).get('game');
const palettes={multi_hot_5_super_wilds:[159,244,94],multi_hot_40:[251,202,108],burning_ice:[123,231,249],hot_foxy_20:[239,137,212],wild_multi_stars:[216,160,255]};
const color=palettes[id];if(!color)return;
const cabinet=document.querySelector('.cabinet'),spin=document.getElementById('spin'),win=document.getElementById('result-banner');
if(!cabinet||!spin)return;
document.body.dataset.visualRelease='2400';
const canvas=document.createElement('canvas');canvas.className='sw-v2400-ambient';canvas.setAttribute('aria-hidden','true');cabinet.insertBefore(canvas,cabinet.firstChild);
const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let width=1,height=1,dpr=1,frame=0,particles=[],active=true,until=0;
function resize(){const r=cabinet.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);dpr=Math.min(window.devicePixelRatio||1,2,Math.sqrt(5400000/(width*height)));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);const count=Math.min(58,Math.ceil(width*height/15000));particles=Array.from({length:count},()=>({x:Math.random()*width,y:Math.random()*height,r:Math.random()*1.4+.4,v:Math.random()*.7+.17,p:Math.random()*6.28}));}
function render(time){frame=0;if(!active||reduced)return;ctx.clearRect(0,0,width,height);for(const p of particles){p.y-=p.v;p.x+=Math.sin(p.p+time*.0005)*.11;if(p.y<0){p.y=height;p.x=Math.random()*width;}const alpha=.18+.38*(.5+.5*Math.sin(time*.002+p.p));ctx.fillStyle='rgba('+color.join(',')+','+alpha.toFixed(3)+')';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}
if(time<until){const glow=ctx.createRadialGradient(width*.5,height*.48,5,width*.5,height*.48,width*.42);glow.addColorStop(0,'rgba(255,232,110,.17)');glow.addColorStop(1,'rgba(255,232,110,0)');ctx.fillStyle=glow;ctx.fillRect(0,height*.22,width,height*.54);}
frame=requestAnimationFrame(render);}
spin.addEventListener('click',()=>{if(!spin.disabled)document.body.classList.add('sw-v2400-spinning');});
const monitor=new MutationObserver(()=>{if(!spin.disabled)document.body.classList.remove('sw-v2400-spinning');});monitor.observe(spin,{attributes:true,attributeFilter:['disabled']});
const wins=win?new MutationObserver(()=>{if(win.classList.contains('won')){until=performance.now()+1800;document.body.classList.add('sw-v2400-bigwin');setTimeout(()=>document.body.classList.remove('sw-v2400-bigwin'),1600)}}):null;
wins?.observe(win,{attributes:true,attributeFilter:['class']});
const ro=new ResizeObserver(resize);ro.observe(cabinet);resize();if(!reduced)frame=requestAnimationFrame(render);
const visibility=()=>{active=!document.hidden;if(!active&&frame){cancelAnimationFrame(frame);frame=0;}if(active&&!frame&&!reduced)frame=requestAnimationFrame(render);};document.addEventListener('visibilitychange',visibility);
window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);ro.disconnect();monitor.disconnect();wins?.disconnect();document.removeEventListener('visibilitychange',visibility)},{once:true});
})();
