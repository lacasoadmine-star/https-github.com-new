const id=new URLSearchParams(location.search).get('game')||location.pathname.split('/').at(-1);
if(id==='sw-burning-ice-40-r3'){
 const settings=document.createElement('dialog');settings.id='cabinet-settings';settings.setAttribute('aria-label','Game settings');settings.innerHTML='<h2>Game settings</h2><div class="settings-grid"></div><button type="button" class="settings-close">Close</button>';document.body.append(settings);
 const group=settings.querySelector('.settings-grid');for(const id of ['sound','quality','fullscreen','turbo','rules-button']){const e=document.getElementById(id);if(e)group.append(e)}
 for(const id of ['special-actions','quick-bets','verify-fair','round-playback']){const e=document.getElementById(id);if(e)settings.querySelector('.settings-close').before(e)}
 const menu=document.createElement('button');menu.id='cabinet-menu';menu.type='button';menu.setAttribute('aria-label','Game settings');menu.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';document.querySelector('main>header').append(menu);menu.onclick=()=>settings.showModal();settings.querySelector('.settings-close').onclick=()=>settings.close();
 document.getElementById('rules-button').addEventListener('click',()=>settings.close());
 document.querySelector('.stage').after(document.querySelector('.meters'));
}
if(id==='sw-burning-ice-40-r3'){
 const settings=document.getElementById('cabinet-settings'),stake=document.getElementById('stake'),play=document.getElementById('play');settings.querySelector('.settings-close').before(stake.parentElement);
 const amount=()=>{play.dataset.bet=Number(stake.value).toFixed(2)+' ETB'};amount();document.addEventListener('input',amount);document.addEventListener('click',()=>requestAnimationFrame(amount));
 const bet=document.createElement('button');bet.type='button';bet.className='cabinet-bet';bet.textContent='BET';bet.onclick=()=>settings.showModal();document.getElementById('controls').append(bet);
}
