const P='/player-v236/';
function once(s,a,b,path){if(!s.includes(a)||s.indexOf(a)!==s.lastIndexOf(a))throw Error('V236_SOURCE_MISMATCH '+path+' '+a.slice(0,70));return s.replace(a,b);}
const changes={
 '/zplaybet-v232/game.js':[
 ['let startupEpoch=0,startupController=null;','let startupEpoch=0,startupController=null,lastPaint=0;'],
 ['function fps(now){if(disposed)return;const dt=Math.min(.05,(now-last)/1000);last=now;reels?.render(now);if(fx){fx.update(dt);fx.render();}animationFrame=requestAnimationFrame(fps);}',"function fps(now){if(disposed||document.hidden){animationFrame=0;return;}const active=spinning||fx?.count>0||document.body.dataset.winFlash==='true';if(active||now-lastPaint>=250){const dt=Math.min(.05,(now-last)/1000);last=now;lastPaint=now;reels?.render(now);if(fx){fx.update(dt);fx.render();}}animationFrame=requestAnimationFrame(fps);}"],
 ["}else void updateBalance({quiet:true});", "}else{if(!animationFrame){last=performance.now();animationFrame=requestAnimationFrame(fps);}void updateBalance({quiet:true});}"],
 ["}catch(e){if(lifecycle.state==='SETTLED')", "}catch(e){audio.playError();if(lifecycle.state==='SETTLED')"]
 ],
 '/mh5-video-v1/scene.mjs':[
 ['loop(now){if(this.disposed)return;this.draw(now);this.frame=requestAnimationFrame(this.loop);}',"loop(now){if(this.disposed||document.hidden){this.frame=0;return;}const active=this.running||this.tap||this.win&&now-this.win.time<2700;if(active||!this.lastPaint||now-this.lastPaint>=250){this.lastPaint=now;this.draw(now);}this.frame=requestAnimationFrame(this.loop);}"],
 ['this.loop=this.loop.bind(this);this.frame=requestAnimationFrame(this.loop);',"this.loop=this.loop.bind(this);this.visible=()=>{if(!document.hidden&&!this.disposed&&!this.frame){this.lastPaint=0;this.frame=requestAnimationFrame(this.loop);}};document.addEventListener('visibilitychange',this.visible);this.draw(performance.now());this.frame=requestAnimationFrame(this.loop);"],
 ['dispose(){this.disposed=true;cancelAnimationFrame(this.frame);this.cancel();}',"dispose(){this.disposed=true;document.removeEventListener('visibilitychange',this.visible);cancelAnimationFrame(this.frame);this.cancel();}"]
 ],
 '/mh5-video-v1/app.mjs':[
 ["}catch(error){sound.stopLoop();scene.cancel();state.auto=0;", "}catch(error){sound.stopLoop();sound.playError();scene.cancel();state.auto=0;"],
 ['The game service confirms every result and credited win.', 'Winning paylines are highlighted and all wins are shown in ETB.']
 ],
 '/zplaybet-v232/api.js':[
 ["const ROOT='/api/slots';",`import {playerError,finalPrecondition} from '${P}player-errors.mjs';\nconst ROOT='/api/slots';`],
 ['data.detail||`HTTP_${response.status}`', 'playerError(data.detail)'],
 ['error?.status>=400&&error.status<500&&rejectedCodes.has(error.code)', 'error?.status>=400&&error.status<500&&rejectedCodes.has(error.code)||finalPrecondition(error?.code)']
 ],
 '/mh5-video-v1/service.mjs':[
 ["export const GAME=",`import {playerError,finalPrecondition} from '${P}player-errors.mjs';\nexport const GAME=`],
 ["typeof data.detail==='string'?data.detail:'The game service is unavailable.'", "playerError(data.detail)"],
 ["'FREE_SPIN_BET_LOCKED'].includes(error.code)", "'FREE_SPIN_BET_LOCKED'].includes(error.code)||finalPrecondition(error.code)"]
 ],
 '/zplaybet-v232/gallery.js':[
 ["'ETB · Uses your existing player account':'Live engine connection unavailable'", "'ETB':'This game is temporarily unavailable'"]
 ]
};
export const transformPaths=Object.keys(changes);
export function transform(path,s){for(const[a,b]of changes[path]||[])s=once(s,a,b,path);return s;}
export function fingerprint(specifier,base='https://player.invalid/'){
 if(!/^(?:\.\.?\/|\/)/.test(specifier))return specifier;
 const u=new URL(specifier,base);if(!/\.(?:m?js|css|webp|png|jpe?g|svg)$/.test(u.pathname))return specifier;
 u.searchParams.set('pv','236');return specifier.startsWith('/')?u.pathname+u.search+u.hash:specifier.split(/[?#]/)[0]+u.search+u.hash;
}
export function versionModule(source){return source.replace(/(\bfrom\s*['"])([^'"\n]+)(['"])/g,(_,a,b,c)=>a+fingerprint(b)+c).replace(/(\bimport\s*\(\s*['"])([^'"\n]+)(['"]\s*\))/g,(_,a,b,c)=>a+fingerprint(b)+c);}
export function versionCSS(source,base){return source.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g,(_,q,url)=>'url('+q+fingerprint(url,base)+q+')');}
export function updateHTML(source,{presence,preloads=[]}={}){
 let s=source.replace(/(\b(?:src|href)=['"])([^'"\s]+)(['"])/g,(_,a,b,c)=>a+fingerprint(b)+c);
 const additions=preloads.map(path=>'<link rel="modulepreload" href="'+fingerprint(path)+'">').join('')+(presence?'<script type="module" src="'+presence+'"></script>':'');
 return s.replace('</head>',additions+'</head>');
}

