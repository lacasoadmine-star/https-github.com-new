import {paylineChart} from './payline-chart.mjs';
const titles = {
  hot_foxy_20: 'Foxy Hot 20',
  multi_hot_5_video: 'Multi Hot 5',
  multi_hot_40: 'Multi Hot 40',
  burning_ice: 'Burning Ice',
  wild_multi_stars: 'Wild Multi Stars',
};
const cabinets = {hot_foxy_20: 'foxy', multi_hot_5_video: 'multi', multi_hot_40: 'multi', burning_ice: 'ice', wild_multi_stars: 'stars'};
const logos = {
  hot_foxy_20: '<span class="title-fox title-gold"><small>Hot</small>Foxy <span class="title-number">20</span></span>',
  multi_hot_5_video: '<span class="title-gold">MULTI HOT</span> <span class="title-number">5</span>',
  multi_hot_40: '<span class="title-gold">MULTI HOT</span> <span class="title-number">40</span>',
  burning_ice: '<span class="title-gold">BURNING ICE</span>',
  wild_multi_stars: '<span class="title-gold title-stars-small">WILD MULTI</span><span class="title-gold title-stars">STARS</span>',
};

export function applyDesign(id) {
  document.body.dataset.game = id;
  document.body.dataset.cabinetVersion = '2900';
  const menu=document.getElementById('options-open');
  if(id==='multi_hot_5_video'||id==='burning_ice')document.querySelector('.cabinet').append(menu);
  else document.querySelector('.bottom-meters').prepend(menu);
  document.body.dataset.cabinet = cabinets[id] || 'multi';
  const shieldControls = id === 'burning_ice' || id === 'multi_hot_5_video';
  const stepsHome = document.getElementById(shieldControls ? 'ice-bet-rail' : 'bet-controls-home');
  if (stepsHome) {
    for (const name of ['bet-dec', 'bet-inc']) {
      const button = document.getElementById(name);
      if (shieldControls) stepsHome.parentElement.append(button);
      else if (name === 'bet-dec') stepsHome.prepend(button);
      else stepsHome.append(button);
    }
  }
}

const $ = id => document.getElementById(id);
const dialog = $('options-dialog');
let opener;

function openOptions(event) {
  if (!dialog.open) { opener = event.currentTarget; dialog.showModal(); }
  const rules = event.currentTarget.id === 'rules-shortcut';
  const target = rules ? dialog.querySelector('.sw-game-rules') : dialog.querySelector('.bet-panel');
  if (target) {
    target.tabIndex = -1;
    target.scrollIntoView({block: 'start', behavior: 'instant'});
    target.focus({preventScroll: true});
  }
}

for (const id of ['bet-open', 'bet-meter', 'options-open', 'rules-shortcut']) {
  $(id).addEventListener('click', openOptions);
}
$('options-close').onclick = () => dialog.close();
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  if (!document.querySelector('.overlay:not(.hidden)')) opener?.focus();
});

const fmt = new Intl.DateTimeFormat('en-GB', {timeZone: 'Africa/Addis_Ababa', hour: '2-digit', minute: '2-digit', hour12: false});
function clock() { $('studio-clock').textContent = fmt.format(new Date()); }
clock();
let timer = setInterval(clock, 30000);
window.addEventListener('pagehide', () => clearInterval(timer));
window.addEventListener('pageshow', event => {
  if (event.persisted) { clock(); timer = setInterval(clock, 30000); }
});

$('turbo').onclick = () => {
  const active = document.body.dataset.turbo !== 'true';
  document.body.dataset.turbo = String(active);
  $('turbo').setAttribute('aria-pressed', String(active));
  $('turbo').setAttribute('aria-label', active ? 'Turn turbo animation off' : 'Turn turbo animation on');
};

const bar = $('wheel-values');
function arrange() {
  const cells = [...bar.children];
  const active = cells.findIndex(cell => cell.classList.contains('active'));
  const center = active < 0 ? Math.floor(cells.length / 2) : active;
  cells.forEach((cell, index) => {
    let step = index - center;
    if (step > cells.length / 2) step -= cells.length;
    if (step < -cells.length / 2) step += cells.length;
    cell.style.setProperty('--step', step);
    cell.dataset.visible = String(Math.abs(step) <= 1);
    cell.dataset.center = String(step === 0);
  });
  $('wheel').setAttribute('aria-label', active < 0 ? 'Multiplier reel; no settled result' : `Settled multiplier ${cells[active].dataset.multiplier} times`);
}
new MutationObserver(arrange).observe(bar, {subtree: true, childList: true, attributes: true, attributeFilter: ['class']});

window.addEventListener('superwin:model-ready', ({detail}) => {
  const model = detail.model;
  const title = titles[model.id] || model.name;
  if (logos[model.id]) $('game-title').innerHTML = logos[model.id];
  else $('game-title').textContent = title;
  $('game-title').setAttribute('aria-label', title);
  document.title = `${title} · ZPLAY`;
  $('visible-line-count').textContent = `${model.paylines} LINES FIXED`;
  $('game-subtitle').textContent = `${model.reels} REELS · ${model.rows} ROWS · ${model.paylines} FIXED LINES`;
  $('reel-canvas').setAttribute('aria-label', `${title}: ${model.reels} reels and ${model.rows} rows`);
  $('reels-wrapper').style.setProperty('--grid-ratio', `${model.reels} / ${model.rows}`);
  const gamble = model.rules?.gamble;
  $('ice-gamble').title=gamble?'Gamble the last win':'Gamble unavailable in current server rules';
  document.body.dataset.gambleAvailable=String(!!gamble);
  $('gamble-description').textContent = gamble
    ? `${Number((gamble.winProbability * 100).toFixed(2))}% win chance. A win returns ${gamble.winMultiplier}× the gambled amount; a loss returns zero. Maximum ${gamble.maxRounds} attempts.`
    : 'The game rules determine the win chance and maximum attempts.';
  arrange();
  const rules=dialog.querySelector('.sw-game-rules');
  if(rules){
    let chart=rules.querySelector('.server-payline-chart');
    if(!chart){chart=document.createElement('section');chart.className='server-payline-chart';rules.append(chart);}
    chart.innerHTML='<h3>PAYLINE CHART</h3><div class="payline-diagrams">'+paylineChart(model)+'</div>';
  }
});

// Reuse the existing RULES and HISTORY buttons and their existing handlers.
const navigation=document.createElement('nav');
navigation.className='cabinet-help-nav';navigation.setAttribute('aria-label','Game information');
const settingsButton=document.createElement('button');
settingsButton.type='button';settingsButton.textContent='SETTINGS';
settingsButton.addEventListener('click',()=>{
  const panel=dialog.querySelector('.audio-settings');panel?.scrollIntoView({block:'start'});
  if(panel){panel.tabIndex=-1;panel.focus({preventScroll:true});}
});
navigation.append($('rules-shortcut'),settingsButton,$('history'));
dialog.append(navigation);
const roundLabel=document.createElement('output');
roundLabel.className='help-round-id';roundLabel.textContent='No settled round';
dialog.querySelector('header').append(roundLabel);
window.addEventListener('superwin:round-settled',({detail})=>{
  roundLabel.textContent='ROUND '+String(detail.roundId||'—');
});

// Keep keyboard focus inside the visible non-native result dialogs.
document.addEventListener('keydown', event => {
  const overlay = document.querySelector('.overlay:not(.hidden)');
  if (!overlay) return;
  const controls = [...overlay.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')];
  if (event.key === 'Escape') {
    const close = overlay.querySelector('.close:not(:disabled)');
    if (close) { event.preventDefault(); close.click(); }
  } else if (event.key === 'Tab' && controls.length) {
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  }
});

window.addEventListener('superwin:round-settled', ({detail}) => {
  const out = $('settled-multiplier');
  const multiplier = Number(detail.wheelMultiplier);
  out.replaceChildren(document.createTextNode(Number.isFinite(multiplier) && multiplier > 0 ? `${multiplier}×` : '—'));
  const label = document.createElement('small');
  label.textContent = 'MULTIPLIER';
  out.append(label);
});

document.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat || dialog.open || event.target.closest('button,a,input,textarea,select,[contenteditable]') || document.querySelector('.overlay:not(.hidden)')) return;
  event.preventDefault();
  if (!$('spin').disabled) $('spin').click();
});
