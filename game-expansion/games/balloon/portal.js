// Adds a native game link only to an existing catalog grid. Never overlays,
// hides, rewrites, or duplicates any legacy game tiles.
const root=document.querySelector('[data-game-grid],#gamesGrid,#game-grid,.games-grid,.game-grid,.catalog-grid');
if(root&&!document.querySelector('a[href="/games/balloon_native"]')){
 const link=document.createElement('a');
 link.href='/games/balloon_native';link.className='zplay-balloon-native-card';
 link.setAttribute('aria-label','Play Balloon, server wallet ETB');
 link.style.cssText='display:grid;place-content:center;gap:6px;min-height:150px;padding:16px;text-align:center;border:1px solid #40bfe4;border-radius:12px;text-decoration:none;color:white;background:linear-gradient(145deg,#06bbf1,#026fe2)';
 const name=document.createElement('strong');name.textContent='🎈 BALLOON';name.style.cssText='font-size:22px;text-shadow:0 2px 3px #02519c';
 const type=document.createElement('span');type.textContent='Hold & Collect · ETB';type.style.cssText='font-size:12px';
 link.append(name,type);root.appendChild(link);
}
