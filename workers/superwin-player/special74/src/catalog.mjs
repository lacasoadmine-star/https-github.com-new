// Add a separate section to the observed host main; existing game nodes are never rewritten.
const PREFIX='/special-games/';
const response=await fetch(PREFIX+'catalog.json',{credentials:'same-origin',redirect:'error'}).catch(()=>null);
if(response?.ok){
 const release=await response.json();
 if(release.ready===true&&Array.isArray(release.entries)&&release.entries.length===74&&new Set(release.entries.map(e=>e.id)).size===74&&release.entries.every(e=>e.ready===true&&typeof e.title==='string'&&e.title.length>0&&e.gamePath?.startsWith(PREFIX+'play/')&&e.cover?.startsWith(PREFIX+'assets/'))){
  const section=document.createElement('section');section.id='superwin-special74';section.setAttribute('aria-label','Special Games');
  const heading=document.createElement('h2');heading.textContent='Special Games';section.append(heading);
  const grid=document.createElement('div');grid.className='special74-cards';section.append(grid);
  const sorted=[...release.entries].sort((a,b)=>a.title.localeCompare(b.title,'en',{numeric:true,sensitivity:'base'}));
  for(const game of sorted){
   const card=document.createElement('a');card.className='special74-card';card.href=game.gamePath;card.dataset.special74Id=game.id;
   const cover=document.createElement('img');cover.src=game.cover;cover.alt=game.title;cover.loading='lazy';cover.width=493;cover.height=617;
   const title=document.createElement('span');title.textContent=game.title;card.append(cover,title);grid.append(card);
  }
  const mount=()=>{
   const main=document.querySelector('main.player-main');
   // The existing catalogue marker identifies the games view after SPA navigation.
   if(!main?.querySelector('#sw-v116-games')){
    if(section.isConnected)section.remove();
    return;
   }
   if(!main.querySelector('#superwin-special74'))main.append(section);
  };
  mount();new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
 }
}
