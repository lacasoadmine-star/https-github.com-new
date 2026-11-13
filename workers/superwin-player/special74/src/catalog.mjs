// Replace the observed games catalogue only after the complete replacement release is valid.
const PREFIX='/special-games/';
const response=await fetch(PREFIX+'catalog.json',{credentials:'same-origin',redirect:'error'}).catch(()=>null);
if(response?.ok){
 const release=await response.json().catch(()=>null);
 if(release?.ready===true&&release.legacyDisposition==='replace-existing-game-presentations-after-complete-74-release'&&Array.isArray(release.entries)&&release.entries.length===74&&release.entries.every(e=>e&&typeof e.id==='string'&&e.id.trim()&&e.ready===true&&typeof e.title==='string'&&e.title.trim()&&typeof e.gamePath==='string'&&e.gamePath.startsWith(PREFIX+'play/')&&typeof e.cover==='string'&&e.cover.startsWith(PREFIX+'assets/'))&&new Set(release.entries.map(e=>e.id)).size===74&&new Set(release.entries.map(e=>e.gamePath)).size===74){
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
   // Remove the rejected NEW74 shortcut, including a late legacy-script insertion.
   document.getElementById('superwin-new74-entry')?.remove();
   // Keep the host's view marker; only its old game catalogue children are replaced.
   const host=main?.querySelector('#sw-v116-games');
   if(!host){
    if(section.isConnected)section.remove();
    return;
   }
   if(host.childNodes.length!==1||host.firstChild!==section)host.replaceChildren(section);
  };
  mount();new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
 }
}
