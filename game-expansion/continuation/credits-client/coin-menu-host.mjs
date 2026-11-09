import {COIN_MENU_ICONS} from './coin-menu-source.mjs';

// Decorative, literal source SVGs only. Keep the host's text, accessibility
// labels and click/navigation/audio handlers. No optional provider features.
export function mountCoinMenuGlyphs({ui,document=globalThis.document,soundEnabled=true}){
 const entries=[['menuBet','bet'],['menuRules','infoOutline'],['menuSound',soundEnabled?'soundOn':'soundOff']];
 const nodes=new Map();let disposed=false;
 const sync=({soundEnabled=true}={})=>{
  if(disposed)return;
  for(const [id,original]of entries){
   const button=ui[id];if(!button)continue;
   let node=nodes.get(id);
   if(!node){node=document.createElement('span');node.dataset.coinMenuGlyph=id;node.setAttribute('aria-hidden','true');nodes.set(id,node);}
   const icon=id==='menuSound'?(soundEnabled?'soundOn':'soundOff'):original;
   if(node.dataset.icon!==icon){node.innerHTML=COIN_MENU_ICONS[icon];node.dataset.icon=icon;}
   // A canonical textContent update (e.g. Sound on/off) removes child nodes.
   if(node.parentElement!==button)button.prepend(node);
  }
 };
 sync({soundEnabled});
 return {sync,dispose(){if(disposed)return;disposed=true;for(const node of nodes.values())node.remove();nodes.clear();}};
}
