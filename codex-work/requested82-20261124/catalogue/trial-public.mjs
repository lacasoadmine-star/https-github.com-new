export const TRIAL_POLICY='USER_AUTHORIZED_FIRST_PAIR_LIVE_TRIAL';
export const TRIAL_GRID='#zplay-live-catalog .restored-catalog-grid:not([data-r82-new-grid])';
export const TRIAL_SHEET_ID='zplay-requested82-pair-sheet';
export const TRIAL_LOADER_ID='zplay-requested82-pair-loader';
export const FIRST_PAIR=Object.freeze([
  {gameId:'zplay72_multi_hot_100_v1',name:'Multi Hot 100',route:'/new-games72/multi-hot-100/',backendGameId:'multihot100_native',cover:'/zplay-restored/20261117-r3/assets/62dfc7813535910b7f6af64f101c188abcaa5916829afcf8783c39691e95f57d.webp',coverBytes:27474,coverSha256:'62dfc7813535910b7f6af64f101c188abcaa5916829afcf8783c39691e95f57d'},
  {gameId:'zplay72_multi_hot_20_v1',name:'Multi Hot 20',route:'/new-games72/multi-hot-20/',backendGameId:'fresh_multihot20',cover:'/zplay-restored/20261117-r3/assets/00dab0692d4afb50debb0bf8ca6ad0606f89280fe953d6dd6fdd55195b3202fe.webp',coverBytes:53134,coverSha256:'00dab0692d4afb50debb0bf8ca6ad0606f89280fe953d6dd6fdd55195b3202fe'}
].map(Object.freeze));
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** A narrowly authorized trial is distinct from completed/live-verified release admission. */
export function validTrialManifest(value){
  if(value?.schema!=='zplay/requested82-first-pair-trial/v1'||value.admission!==TRIAL_POLICY||
    !/^[a-z0-9-]+$/.test(value.releaseId||'')||value.allowedGameCount!==2||value.otherRequestedGamesAdmitted!==false||
    value.completionClaim!==false||value.liveVerified!==false||value.authenticatedProductionSpinsVerified!==false||
    value.verifiedProductionSpinCount!==0||!Array.isArray(value.games)||value.games.length!==2)return false;
  return value.games.every((game,index)=>{
    const expected=FIRST_PAIR[index];return game?.gameId===expected.gameId&&game.name===expected.name&&game.route===expected.route&&
      game.backendGameId===expected.backendGameId&&game.trialEnabled===true&&game.authRequired===true&&game.existingBackend===true&&
      game.serverAuthoritative===true&&game.completionClaim===false&&game.liveVerified===false&&
      game.cover?.path===expected.cover&&game.cover.source==='EXISTING_AUTHORIZED_PUBLIC_ARTWORK'&&
      game.cover.bytes===expected.coverBytes&&game.cover.sha256===expected.coverSha256;
  });
}

export function renderTrialCard(game){
  const expected=FIRST_PAIR.find(item=>item.gameId===game?.gameId);
  if(!expected||game.name!==expected.name||game.route!==expected.route||game.cover?.path!==expected.cover)throw Error('FIRST_PAIR_CARD_INVALID');
  const id=escapeHtml(game.gameId),name=escapeHtml(game.name);
  return `<article class="restored-game-card requested82-trial-card" data-r82-pair-id="${id}" data-status="available"><button class="restored-game-cover-link" type="button" data-r82-pair-details="${id}" aria-label="Fur faahfaahinta ${name}" aria-haspopup="dialog" aria-controls="${TRIAL_SHEET_ID}"><div class="restored-game-art"><img class="restored-game-cover" src="${escapeHtml(game.cover.path)}" alt="" loading="lazy" decoding="async"><span class="requested82-pair-badge" title="Cusboonaysiin cusub">✅ CUSUB</span></div></button><div class="restored-game-details"><h3>${name}</h3><div class="restored-game-actions"><a class="restored-game-account" href="${escapeHtml(game.route)}" aria-label="Play Now · ${name}" data-r82-pair-play="${id}">Play Now</a></div></div></article>`;
}

export function renderTrialSheet(game,{liked=false,favorite=false}={}){
  if(!FIRST_PAIR.some(item=>item.gameId===game?.gameId&&item.route===game.route&&item.cover===game.cover?.path))throw Error('FIRST_PAIR_CARD_INVALID');
  const name=escapeHtml(game.name);
  return `<div class="restored-sheet-panel"><div class="restored-sheet-header"><span class="restored-sheet-handle" aria-hidden="true"></span><h2 class="restored-sheet-title" id="requested82-pair-title">${name}</h2><button class="restored-sheet-close" type="button" aria-label="Xidh faahfaahinta ciyaarta" data-r82-pair-close>×</button></div><div class="restored-sheet-content"><div class="restored-game-art restored-sheet-art"><img class="restored-game-cover" src="${escapeHtml(game.cover.path)}" alt="${name}" loading="eager" decoding="async"></div><div class="restored-sheet-preferences"><span class="restored-sheet-category">Slots</span><div class="requested82-pair-preferences"><button class="restored-sheet-favorite" type="button" data-r82-pair-like aria-pressed="${liked}" aria-label="Like · ${name}"><span aria-hidden="true">${liked?'♥':'♡'}</span><span>Like</span></button><button class="restored-sheet-favorite" type="button" data-r82-pair-favorite aria-pressed="${favorite}" aria-label="${favorite?'Ka saar kuwa la kaydiyey':'Ku dar kuwa la kaydiyey'} · ${name}"><span class="restored-sheet-star" aria-hidden="true">${favorite?'★':'☆'}</span><span>${favorite?'La kaydiyey':'Kaydi'}</span></button></div></div><div class="restored-sheet-actions"><a class="restored-sheet-play" href="${escapeHtml(game.route)}" aria-label="Play Now · ${name} · ETB" data-r82-pair-sheet-play>Play Now</a></div></div></div>`;
}
