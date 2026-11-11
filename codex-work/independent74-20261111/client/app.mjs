import {request, ApiError, parseStake, formatMinor, inputMinor, savePending, loadPending} from './api.mjs';
import {AudioEngine} from './audio.mjs';

const main = document.querySelector('#main');
const audio = new AudioEngine();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const POINTS = [[18,86],[40,79],[64,72],[81,61],[62,51],[36,44],[20,32],[42,24],[65,17],[82,8]];
let game, snapshot, busy = false, pending = loadPending(), auto = null, animation = null, lastRound = null;
let currency = 'ETB', decimals = 2, toastTimer, loadVersion = 0;

function element(tag, className, text) {
  const node = document.createElement(tag); if (className) node.className = className;
  if (text !== undefined) node.textContent = text; return node;
}
function text(id, value) { const node = document.getElementById(id); if (node) node.textContent = value; }
function money(value) { return formatMinor(value, currency, decimals); }
function multiplier(value) { return Number.isFinite(Number(value)) ? (Number(value) / 10000).toFixed(2) + '×' : '—'; }
function activeRound() { const round = snapshot?.activeRound; return round?.status === 'active' && (round.gameId || round.game_id) === game?.id ? round : null; }
function foreignRound() { const round = snapshot?.activeRound; return round?.status === 'active' && (round.gameId || round.game_id) !== game?.id ? round : null; }
function selectedMode() { return activeRound()?.mode || document.getElementById('game-mode')?.value || game?.defaultMode || 'easy'; }
function payoutRows() {
  if (Array.isArray(game?.paytable)) return game.paytable.find(table => table.mode === selectedMode())?.rows || [];
  const values = game?.paytable?.multipliersBps || game?.paytable?.stepMultipliersBps || [];
  return values.map((value, index) => ({step: index + 1, multiplierBps: value}));
}
function roundId(round) { return round?.id || round?.roundId || round?.round_id; }
function walletReady() { return snapshot?.authenticated === true && /^\d+$/.test(String(snapshot?.wallet?.balance_minor)); }
function announce(value) { text('announcement', value); }
function toast(value) {
  const node = document.getElementById('toast'); node.textContent = value; node.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { node.hidden = true; }, 5000);
}
function status(value, kind = '') {
  const node = document.getElementById('game-status'); if (!node) return;
  node.textContent = value; node.className = 'game-status ' + kind; node.setAttribute('role', kind === 'error' ? 'alert' : 'status');
}
function publicError(error) { return error instanceof Error ? error.message : 'The account service is unavailable.'; }

function layout() {
  main.innerHTML = `
    <section class="game-page" aria-labelledby="game-title">
      <div class="page-heading"><div><a class="text-link" href="/">← Main lobby</a><div class="heading-line"><h1 id="game-title">Island Passage</h1><span class="edition-badge">Independent edition</span></div><p id="game-description">Choose your next island. Collect before the passage ends.</p></div><div class="game-tools"><button id="sound-button" class="icon-button" aria-label="Enable sound" aria-pressed="false">♪</button><button id="rules-button" class="secondary-button">Rules &amp; payouts <span aria-hidden="true">↗</span></button></div></div>
      <div class="game-layout">
        <section class="ocean-stage" aria-label="Island game board">
          <div class="stage-heading"><span class="eyebrow">ORIGINAL ISLAND SERIES</span><span id="round-status" class="status-pill">READY TO EXPLORE</span></div>
          <div class="stage-title" aria-hidden="true"><span>ISLAND</span><strong>PASSAGE</strong><i>ONE MORE ISLAND?</i></div>
          <div class="board" id="island-board" role="group" aria-label="Ten ordered islands">
            <svg class="sea-art" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="wave-pattern" width="180" height="105" patternUnits="userSpaceOnUse"><path d="M0 55 Q45 30 90 55 T180 55 M-30 82 Q15 57 60 82 T150 82" fill="none" stroke="#80e6e0" stroke-opacity=".1" stroke-width="2"/></pattern><linearGradient id="route-gradient" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#6cebc0" stop-opacity=".1"/><stop offset="1" stop-color="#e8d792" stop-opacity=".65"/></linearGradient></defs><rect width="1000" height="650" fill="url(#wave-pattern)"/><path id="island-route" fill="none" stroke="url(#route-gradient)" stroke-dasharray="4 12" stroke-linecap="round" stroke-width="3"/><g fill="#d5f3e8" opacity=".2"><path d="M80 100q14-13 28 0q14-13 28 0q-14-6-28 5q-14-11-28-5"/><path d="M780 495q12-11 24 0q12-11 24 0q-12-6-24 4q-12-10-24-4"/></g></svg>
            <div class="shore" aria-hidden="true"><span>START</span><svg viewBox="0 0 100 50"><path d="M0 40Q30 0 60 14T100 40Z" fill="#c7b97e"/><path d="M13 30Q35 8 57 21T89 31Z" fill="#397d69"/></svg></div>
            <div id="islands"></div><div id="explorer" class="explorer" aria-hidden="true"><span>◆</span></div>
          </div>
          <div class="stage-footer"><div><span>STEPS REACHED</span><strong id="step-count">0 <small>/ 10</small></strong></div><div><span>CURRENT MULTIPLIER</span><strong id="current-multiplier">—</strong></div><div class="next-value"><span>NEXT SAFE STEP</span><strong id="next-multiplier">—</strong></div></div>
        </section>
        <aside class="control-panel" aria-label="Bet and round controls">
          <div class="panel-heading"><span class="eyebrow">YOUR EXPEDITION</span><span id="connection-state" class="connection-state">Connecting</span></div>
          <label class="field-label" for="bet-amount">BET AMOUNT <span id="currency-label">ETB</span></label>
          <div class="bet-input"><button id="bet-less" class="amount-button" aria-label="Decrease bet">−</button><input id="bet-amount" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-describedby="bet-limits"><button id="bet-more" class="amount-button" aria-label="Increase bet">+</button></div>
          <p id="bet-limits" class="field-help">Loading available bet limits…</p>
          <label class="mode-field" for="game-mode"><span>PASSAGE MODE</span><select id="game-mode"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
          <div class="collectible"><span>AVAILABLE TO COLLECT</span><strong id="collectible-value">—</strong><small id="collectible-hint">Start a round to explore the islands.</small></div>
          <button id="play-button" class="primary-button" disabled><span aria-hidden="true">▶</span> Start expedition</button>
          <button id="jump-button" class="primary-button jump-button" hidden disabled><span aria-hidden="true">↗</span> Jump to next island</button>
          <button id="collect-button" class="collect-button" disabled>Collect <span id="collect-button-value">—</span></button>
          <button id="finish-animation" class="text-button" hidden>Finish animation</button>
          <div class="auto-row"><button id="auto-toggle" class="secondary-button" aria-expanded="false">↻ Auto</button><button id="refresh-state" class="text-button">Refresh account</button></div>
          <div id="auto-panel" class="auto-panel" hidden><label for="auto-rounds">Expeditions<select id="auto-rounds"><option value="5">5 rounds</option><option value="10">10 rounds</option><option value="25">25 rounds</option></select></label><label for="auto-steps">Collect after<select id="auto-steps"><option value="1">1 safe island</option><option value="2">2 safe islands</option><option value="3">3 safe islands</option></select></label><p>Stops after a loss, connection error, or when this page is hidden. A pending expedition stays open.</p><button id="auto-start" class="secondary-button">Start bounded auto</button></div>
          <div id="game-status" class="game-status" role="status">Connecting to your account…</div>
          <button id="recover-button" class="secondary-button recovery-button" hidden>Check pending round</button>
          <a id="foreign-round-link" class="secondary-button recovery-button" hidden>Return to your open game</a>
          <p class="server-note"><span aria-hidden="true">◈</span> Your account server confirms every bet and payout.</p>
        </aside>
      </div>
      <section class="lower-grid"><div class="about-card"><span class="eyebrow">HOW TO PLAY</span><h2>Find your moment to collect.</h2><ol><li>Choose a bet and start your expedition.</li><li>Jump one island at a time. Each jump can end the round.</li><li>After a safe jump, collect the server-confirmed amount or continue.</li></ol><p class="edition-note">Original artwork, sounds and independent rules. This edition does not reproduce a provider’s game mathematics.</p></div><div class="history-card"><div class="history-heading"><h2>Your recent rounds</h2><span id="history-count">0 rounds</span></div><ol id="round-history" class="round-history"><li class="empty-history">Your completed expeditions appear here.</li></ol></div></section>
    </section>`;
  document.getElementById('game-title').textContent = game.title || 'Island Passage';
  document.title = (game.title || 'Island Passage') + ' · Independent edition';
  const minimum = game.limits?.minBetMinor;
  const field = document.getElementById('bet-amount'); field.value = inputMinor(minimum, decimals);
  document.getElementById('game-mode').value = game.defaultMode || 'easy';
  document.getElementById('game-mode').addEventListener('change', () => { stopAuto(); render(); });
  text('bet-limits', minimum === undefined ? 'Bet limits are unavailable.' : money(minimum) + ' – ' + money(game.limits?.maxBetMinor));
  document.getElementById('island-route').setAttribute('d', 'M70 635 ' + POINTS.map(([x,y]) => `L${x*10} ${y*6.5}`).join(' '));
  const islands = document.getElementById('islands');
  POINTS.forEach(([x,y], index) => {
    const node = element('button', 'island'); node.type = 'button'; node.dataset.cell = index; node.style.left = x + '%'; node.style.top = y + '%';
    node.innerHTML = `<svg viewBox="0 0 100 76" aria-hidden="true"><ellipse cx="50" cy="55" rx="46" ry="18" fill="#143e4c" opacity=".5"/><path class="island-sand" d="M6 48 19 27 39 16 66 18 90 36 95 51 76 65 40 69 14 61Z" fill="#e0ce90"/><path d="M16 43 29 27 48 24 70 28 84 44 69 54 42 58 22 52Z" fill="#59a987"/><path d="M29 37 44 29 59 32 71 42 53 47 37 45Z" fill="#75c69c"/><path d="M60 40 65 15" stroke="#605d38" stroke-width="3"/><path d="M65 17Q46 7 47 22Q57 18 65 19Q76 1 83 16Q73 16 65 20Q85 18 83 31Q74 23 65 21" fill="#1d6a54"/></svg><span class="island-number">${index+1}</span><span class="island-result" aria-hidden="true"></span>`;
    node.setAttribute('aria-label', 'Island ' + (index + 1)); node.disabled = true;
    node.addEventListener('click', () => perform('reveal', {cell: index})); islands.append(node);
  });
  document.getElementById('play-button').addEventListener('click', () => perform('play'));
  document.getElementById('jump-button').addEventListener('click', () => perform('reveal', {cell: Math.min(9, activeRound()?.step || 0)}));
  document.getElementById('collect-button').addEventListener('click', () => perform('collect'));
  document.getElementById('bet-less').addEventListener('click', () => changeBet(-1));
  document.getElementById('bet-more').addEventListener('click', () => changeBet(1));
  document.getElementById('bet-amount').addEventListener('change', () => { stopAuto(); validateBet(true); });
  document.getElementById('sound-button').addEventListener('click', () => { audio.toggle(); updateSound(); });
  document.getElementById('rules-button').addEventListener('click', showRules);
  document.getElementById('refresh-state').addEventListener('click', () => { stopAuto(); refresh(); });
  document.getElementById('recover-button').addEventListener('click', recover);
  document.getElementById('finish-animation').addEventListener('click', () => animation?.finish());
  document.getElementById('auto-toggle').addEventListener('click', () => {
    if (auto) { stopAuto(); return; }
    const panel = document.getElementById('auto-panel'); panel.hidden = !panel.hidden;
    document.getElementById('auto-toggle').setAttribute('aria-expanded', String(!panel.hidden));
  });
  document.getElementById('auto-start').addEventListener('click', startAuto);
  updateSound(); render();
}

function updateSound() {
  const node = document.getElementById('sound-button'); if (!node) return;
  node.textContent = audio.muted ? '♪̸' : '♪'; node.setAttribute('aria-label', audio.muted ? 'Enable sound' : 'Mute sound'); node.setAttribute('aria-pressed', String(!audio.muted));
}
function validateBet(report = false) {
  const amount = parseStake(document.getElementById('bet-amount')?.value || '', decimals);
  const min = game?.limits?.minBetMinor, max = game?.limits?.maxBetMinor;
  const valid = amount !== null && /^\d+$/.test(String(min)) && /^\d+$/.test(String(max)) && BigInt(amount) >= BigInt(min) && BigInt(amount) <= BigInt(max);
  if (!valid && report) status('Enter a bet between ' + money(min) + ' and ' + money(max) + '.', 'error');
  return valid ? amount : null;
}
function changeBet(direction) {
  if (busy || activeRound() || pending || auto) return;
  const input = document.getElementById('bet-amount'), current = parseStake(input.value, decimals), min = game.limits?.minBetMinor, max = game.limits?.maxBetMinor;
  if (current === null || !/^\d+$/.test(String(min)) || !/^\d+$/.test(String(max))) return;
  const next = BigInt(current) + BigInt(min) * BigInt(direction), clamped = next < BigInt(min) ? BigInt(min) : next > BigInt(max) ? BigInt(max) : next;
  input.value = inputMinor(clamped.toString(), decimals); announce('Bet ' + money(clamped));
}

function applyState(value) {
  snapshot = value; currency = value.currency || value.wallet?.currency || currency; decimals = Number.isInteger(value.minor_decimals) ? value.minor_decimals : 2;
  if (value.round) lastRound = value.round;
  text('wallet-balance', /^\d+$/.test(String(value.wallet?.balance_minor)) ? money(value.wallet.balance_minor) : '—');
  text('currency-label', currency); render();
}

async function refresh({quiet = false} = {}) {
  if (!game || busy) return false;
  const version = ++loadVersion;
  busy = true; render();
  if (!quiet) status('Checking your account and current round…');
  try {
    const value = await request('state?game_id=' + encodeURIComponent(game.id));
    if (version !== loadVersion) return false;
    applyState(value);
    if (!walletReady()) { status('Your account wallet is unavailable. Sign in through the main lobby, then refresh.', 'error'); return false; }
    if (pending) status('An earlier action needs confirmation. Check the pending round before continuing.', 'error');
    else if (foreignRound()) status('You have an open round in another independent game. Finish that round before starting here.', 'error');
    else status(activeRound() ? 'Expedition open. Jump to the next island or collect after a safe step.' : 'Your account is connected. Choose a bet to begin.');
    return true;
  } catch (error) {
    if (version !== loadVersion) return false;
    snapshot = null; text('wallet-balance', '—'); status(publicError(error), 'error'); render(); return false;
  } finally { busy = false; render(); }
}

function render() {
  if (!game || !document.getElementById('islands')) return;
  const round = activeRound() || lastRound, active = activeRound(), count = Math.max(0, Math.min(10, Number(round?.step) || 0));
  const disabled = busy || !!pending || !walletReady() || !!foreignRound();
  text('connection-state', busy ? 'Confirming…' : walletReady() ? 'Account connected' : 'Account unavailable');
  document.getElementById('connection-state').classList.toggle('connected', walletReady());
  text('round-status', active ? 'EXPEDITION IN PROGRESS' : lastRound?.status === 'lost' ? 'PASSAGE ENDED' : lastRound?.status === 'collected' ? 'COLLECTED' : 'READY TO EXPLORE');
  text('step-count', count + ' / ' + (round?.maxSteps || 10));
  text('current-multiplier', round ? multiplier(round.multiplierBps) : '—');
  text('next-multiplier', active ? multiplier(active.nextMultiplierBps) : multiplier(payoutRows()[0]?.multiplierBps));
  text('collectible-value', active ? money(active.collectibleMinor) : '—');
  text('collect-button-value', active ? money(active.collectibleMinor) : '—');
  text('collectible-hint', active ? count ? 'Collect now, or take another risk.' : 'Make a safe jump to unlock collection.' : 'Start a round to explore the islands.');
  const play = document.getElementById('play-button'), jump = document.getElementById('jump-button');
  if (active && /^\d+$/.test(String(active.betMinor))) document.getElementById('bet-amount').value = inputMinor(active.betMinor, decimals);
  play.hidden = !!active; play.disabled = disabled || !!auto; jump.hidden = !active; jump.disabled = disabled || count >= (round?.maxSteps || 10) || !!auto;
  document.getElementById('collect-button').disabled = disabled || !active || count < 1 || !!auto;
  for (const id of ['bet-less', 'bet-more', 'bet-amount', 'game-mode']) document.getElementById(id).disabled = disabled || !!active || !!auto;
  if (active?.mode) document.getElementById('game-mode').value = active.mode;
  document.getElementById('auto-toggle').disabled = disabled && !auto;
  document.getElementById('auto-toggle').textContent = auto ? '■ Stop auto · ' + auto.remaining + ' left' : '↻ Auto';
  document.getElementById('auto-start').disabled = disabled || !!active || !!auto;
  document.getElementById('refresh-state').disabled = busy;
  document.getElementById('recover-button').hidden = !pending;
  document.getElementById('recover-button').disabled = busy;
  const foreignLink = document.getElementById('foreign-round-link'); foreignLink.hidden = !foreignRound();
  if (foreignRound()) foreignLink.href = '/independent74/?game=' + encodeURIComponent(foreignRound().gameId || foreignRound().game_id);
  const path = Array.isArray(round?.history) ? round.history : Array.isArray(round?.path) ? round.path : [];
  document.querySelectorAll('.island').forEach((node, index) => {
    const entry = path.find(item => Number(item.step) === index + 1);
    const safe = entry?.survived === true || (!entry && index < count && round?.status !== 'lost');
    const lost = entry?.survived === false;
    node.className = 'island' + (safe ? ' reached' : '') + (lost ? ' lost' : '') + (active && index === count ? ' next' : '');
    node.disabled = disabled || !active || index !== count || !!auto;
    node.querySelector('.island-result').textContent = safe ? '✓' : lost ? '×' : '';
    node.setAttribute('aria-label', 'Island ' + (index + 1) + (safe ? ', safely reached' : lost ? ', passage ended' : active && index === count ? ', jump here' : ', not reached'));
  });
  const explorer = document.getElementById('explorer');
  const location = count ? POINTS[Math.min(count - 1, 9)] : [7, 96];
  explorer.style.left = location[0] + '%'; explorer.style.top = location[1] + '%'; explorer.classList.toggle('ended', round?.status === 'lost');
  renderHistory();
}

function renderHistory() {
  const history = Array.isArray(snapshot?.history) ? snapshot.history.filter(item => ['lost', 'collected'].includes(item.status)) : [];
  const list = document.getElementById('round-history'); list.replaceChildren();
  text('history-count', history.length + (history.length === 1 ? ' round' : ' rounds'));
  if (!history.length) { list.append(element('li', 'empty-history', 'Your completed expeditions appear here.')); return; }
  history.slice(0, 8).forEach(item => {
    const row = element('li', 'history-row'), won = item.status === 'collected' || BigInt(String(item.payout_minor || item.winMinor || '0')) > 0n;
    const left = element('div'); left.append(element('strong', '', won ? 'Collected' : 'Passage ended'));
    const id = item.id || item.round_id || item.roundId || '';
    left.append(element('small', '', id ? 'Round ' + String(id).slice(0, 8) : 'Confirmed round'));
    const right = element('div', won ? 'history-win' : 'history-loss');
    right.append(element('strong', '', money(item.payout_minor ?? item.winMinor ?? '0')));
    right.append(element('small', '', 'Bet ' + money(item.stake_minor ?? item.betMinor)));
    row.append(left, right); list.append(row);
  });
}

function animateRound(previous, next) {
  if (!next || previous?.step === next.step || reducedMotion.matches) return Promise.resolve();
  return new Promise(resolve => {
    const stage = document.querySelector('.ocean-stage'); stage.classList.add('jumping');
    const finish = () => { clearTimeout(timer); stage.classList.remove('jumping'); animation = null; document.getElementById('finish-animation').hidden = true; resolve(); };
    const timer = setTimeout(finish, 650); animation = {finish}; document.getElementById('finish-animation').hidden = false;
  });
}

async function perform(type, options = {}, {fromAuto = false, replayBody = null} = {}) {
  if (busy || !game || foreignRound() || (!fromAuto && auto) || (pending && !replayBody)) return false;
  if (!walletReady()) { status('Your account wallet must be connected before playing.', 'error'); return false; }
  const before = activeRound(), stake = type === 'play' ? validateBet(true) : null;
  if (!replayBody && type === 'play' && (!stake || before)) return false;
  if (!replayBody && type !== 'play' && (!before || !roundId(before) || !Number.isInteger(before.version))) { status('Refresh the current round before continuing.', 'error'); return false; }
  const body = replayBody || {request_id: crypto.randomUUID(), game_id: game.id, type, ...(type === 'play' ? {stake_minor: stake, options: {mode: selectedMode()}} : {round_id: roundId(before), expected_version: before.version, ...(type === 'reveal' ? {options} : {})})};
  busy = true; pending = body; savePending(body); render();
  status(type === 'play' ? 'Confirming your bet…' : type === 'collect' ? 'Confirming your collection…' : 'Checking the next island…');
  await audio.unlock(); if (type !== 'collect') audio.play('start');
  try {
    const value = await request('action', {method: 'POST', body, sessionGuard: snapshot?.sessionGuard});
    if (!value.round || !value.wallet || !/^\d+$/.test(String(value.wallet.balance_minor))) throw new ApiError('The round response is incomplete. Check its status before continuing.', {ambiguous: true});
    pending = null; savePending(null); applyState(value);
    await animateRound(before, value.round);
    const round = value.round;
    if (round.status === 'lost') { audio.play('lose'); status('The passage ended. This expedition has no payout.'); announce('Passage ended.'); stopAuto(false); }
    else if (round.status === 'collected') { audio.play(Number(round.multiplierBps) >= 50000 ? 'big' : 'win'); status('Collected ' + money(value.receipt?.payout_minor ?? round.winMinor) + '. Your account balance is confirmed.', 'success'); announce('Collected ' + money(value.receipt?.payout_minor ?? round.winMinor)); }
    else if (type === 'reveal') { audio.play('tick'); status('Safe landing. ' + money(round.collectibleMinor) + ' is available to collect.', 'success'); announce('Safe island ' + round.step + '. Collectible ' + money(round.collectibleMinor)); }
    else status('Expedition started. Choose the next island.');
    return true;
  } catch (error) {
    stopAuto(false);
    if (error instanceof ApiError && !error.ambiguous) { pending = null; savePending(null); }
    status(publicError(error) + (pending ? ' No new bet can start until this action is checked.' : ''), 'error');
    return false;
  } finally { busy = false; render(); }
}

async function recover() {
  if (!pending || busy) return;
  const body = pending;
  if (body.game_id !== game.id) { status('A different independent game has an unresolved action. Return to that game before playing.', 'error'); return; }
  const ready = await refresh({quiet: true});
  if (!ready) return;
  const receipt = snapshot?.history?.find(item => item.request_id === body.request_id || item.requestId === body.request_id);
  if (receipt) { pending = null; savePending(null); status('The earlier action is confirmed in your round history.', 'success'); render(); return; }
  // Replay uses the original request ID. A server with idempotency returns its original receipt.
  await perform(body.type, body.options || {}, {replayBody: body});
}

function stopAuto(showMessage = true) {
  if (!auto) return;
  auto.cancelled = true; auto = null;
  if (showMessage) toast(activeRound() ? 'Auto stopped. Your open expedition is still available.' : 'Auto stopped.');
  render();
}
async function startAuto() {
  if (busy || auto || pending || activeRound() || !walletReady() || !validateBet(true)) return;
  const count = Number(document.getElementById('auto-rounds').value), steps = Number(document.getElementById('auto-steps').value);
  if (![5,10,25].includes(count) || ![1,2,3].includes(steps)) return;
  const run = {remaining: count, cancelled: false}; auto = run;
  document.getElementById('auto-panel').hidden = true; document.getElementById('auto-toggle').setAttribute('aria-expanded', 'false'); render();
  while (!run.cancelled && run.remaining > 0 && document.visibilityState === 'visible') {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (run.cancelled || document.visibilityState !== 'visible') break;
    if (!await perform('play', {}, {fromAuto: true})) break;
    while (!run.cancelled && activeRound() && activeRound().step < steps) {
      await new Promise(resolve => setTimeout(resolve, 450));
      if (run.cancelled || document.visibilityState !== 'visible') break;
      if (!await perform('reveal', {cell: activeRound().step}, {fromAuto: true})) { run.cancelled = true; break; }
    }
    if (run.cancelled || !activeRound()) break;
    await new Promise(resolve => setTimeout(resolve, 450));
    if (run.cancelled || document.visibilityState !== 'visible') break;
    if (!await perform('collect', {}, {fromAuto: true})) break;
    run.remaining--; render();
  }
  if (auto === run) { auto = null; render(); toast(activeRound() ? 'Auto stopped with an open expedition.' : 'Auto finished.'); }
}

function showRules() {
  const root = document.getElementById('rules-body'); root.replaceChildren(); text('rules-title', (game.title || 'Island Passage') + ' rules');
  const list = element('ol', 'rules-list');
  (Array.isArray(game.rules) ? game.rules : []).forEach(rule => list.append(element('li', '', typeof rule === 'string' ? rule : rule.text || rule.description || '')));
  if (!list.childElementCount) list.append(element('li', '', 'Published rules are unavailable. Account play remains unavailable until rules can be verified.'));
  root.append(list);
  const rows = payoutRows();
  if (rows.length) {
    const table = element('table', 'paytable'); table.innerHTML = '<caption>Independent safe-step payout multipliers</caption><thead><tr><th scope="col">Safe islands</th><th scope="col">Payout multiplier</th></tr></thead>';
    const body = element('tbody'); rows.forEach((value, i) => { const row = element('tr'); row.append(element('td', '', String(value.step || i + 1)), element('td', '', multiplier(value.multiplierBps))); body.append(row); }); table.append(body); root.append(table);
  }
  root.append(element('p', 'edition-note', 'A successful first jump does not guarantee that a jump is safe. Every jump can end the round. Payouts and available collection amounts come from the account server.'));
  document.getElementById('rules-dialog').showModal();
}

document.getElementById('close-rules').addEventListener('click', () => document.getElementById('rules-dialog').close());
document.getElementById('rules-done').addEventListener('click', () => document.getElementById('rules-dialog').close());
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') { stopAuto(false); animation?.finish(); } });
addEventListener('pagehide', () => { stopAuto(false); animation?.finish(); });
addEventListener('offline', () => { stopAuto(false); status('Connection lost. Your current expedition stays on the server. Refresh before continuing.', 'error'); });
document.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat || document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA|BUTTON|A/.test(event.target.tagName)) return;
  const button = document.getElementById(activeRound() ? 'jump-button' : 'play-button');
  if (button && !button.disabled) { event.preventDefault(); button.click(); }
});

async function boot() {
  try {
    const catalog = await request('catalog'), games = Array.isArray(catalog.games) ? catalog.games : [];
    const requested = new URL(location.href).searchParams.get('game');
    if (requested && requested !== 'ind74_mineisland2') throw new Error('This independent edition is still being built. Open Mine Island 2 from the independent games home.');
    game = games.find(item => item.id === 'ind74_mineisland2') || games.find(item => /mine\s*island\s*2/i.test(item.catalogName || item.title || ''));
    if (!game) throw new Error('The first independent game is not available in the catalog yet.');
    if (!/^ind74_[a-z0-9_]+$/.test(game.id)) throw new Error('The game definition could not be verified.');
    layout(); await refresh();
  } catch (error) {
    main.replaceChildren(); const panel = element('section', 'empty-state');
    panel.append(element('span', 'eyebrow', 'INDEPENDENT EDITION'), element('h1', '', 'Unable to load this game'), element('p', '', publicError(error)));
    const retry = element('button', 'secondary-button', 'Try again'); retry.addEventListener('click', () => location.reload()); const home = element('a', 'text-link', 'Return to main lobby'); home.href = '/'; panel.append(retry, home); main.append(panel);
  }
}
boot();
