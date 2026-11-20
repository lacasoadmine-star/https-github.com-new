import { deal } from './round.mjs';
import { games } from './games/catalog.mjs';
import { CashGame } from './cash.mjs';

const game = games.find(model => model.slug === document.body.dataset.game);
const get = id => document.getElementById(id);
const board = get('board');
if (game.columns === 5) board.classList.add('wide');
board.setAttribute('aria-label', game.columns + ' reels');
const spin = get('spin');
const auto = get('auto');
const levelButton = get('level');
const sound = get('sound');
const turbo = get('turbo');
const dialog = get('dialog');
const content = get('dialog-content');
const cash = document.body.dataset.mode === 'paid' ? new CashGame(game) : null;
let bet = null;
let connecting = false;

let level = 1;
let rounds = 0;
let score = 0;
let active = null;
let remaining = 0;
let next = null;
let quick = false;
let audio = null;
let enabled = false;
const voices = new Set();
const reels = Array.from({ length: game.columns }, () => {
  const reel = document.createElement('div');
  reel.className = 'reel';
  const tiles = Array.from({ length: game.rows }, () => {
    const tile = document.createElement('span');
    tile.className = 'tile';
    reel.append(tile);
    return tile;
  });
  board.append(reel);
  return { reel, tiles };
});

function paint(column, values) {
  reels[column].tiles.forEach((tile, row) => {
    const id = values[row];
    tile.dataset.symbol = id;
    tile.textContent = game.symbols[id];
    tile.setAttribute('aria-label', game.names[id]);
    tile.classList.remove('hit');
  });
}

function note(frequency, duration = 0.08) {
  if (!enabled || !audio || audio.state !== 'running' || document.hidden || !document.hasFocus()) return;
  const voice = audio.createOscillator();
  const envelope = audio.createGain();
  const start = audio.currentTime;
  voice.frequency.value = frequency;
  envelope.gain.setValueAtTime(0.09, start);
  envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
  voice.connect(envelope).connect(audio.destination);
  voice.onended = () => { voices.delete(voice); voice.disconnect(); envelope.disconnect(); };
  voices.add(voice);
  voice.start();
  voice.stop(start + duration);
}

function controls() {
  spin.textContent = active ? 'STOP' : 'SPIN';
  spin.disabled = !active && (remaining > 0 || connecting || Boolean(cash && !cash.current));
  auto.disabled = connecting || Boolean(cash && !cash.current);
  auto.textContent = remaining > 0 ? 'STOP AUTO' : 'AUTO';
  levelButton.disabled = Boolean(active || remaining || connecting || cash && !cash.current);
}

function stopAuto() {
  clearTimeout(next);
  next = null;
  remaining = 0;
  controls();
}

function reveal(round, column) {
  if (active !== round || !reels[column].reel.classList.contains('rolling')) return;
  reels[column].reel.classList.remove('rolling');
  paint(column, round.result.grid[column]);
  note(game.accentNotes[column]);
  if (++round.revealed < reels.length) return;
  clearInterval(round.preview);
  round.timers.forEach(clearTimeout);
  active = null;
  rounds += 1;
  if (!cash) score += round.result.score;
  for (const line of round.result.lines) {
    game.lines[line].forEach((row, index) => reels[index].tiles[row].classList.add('hit'));
  }
  get('rounds').value = rounds;
  get('score').value = cash ? round.result.displayBalance + ' ETB' : score;
  get('multiplier').value = (cash ? round.result.wheelMultiplier : round.result.multiplier) + '×';
  get('status').textContent = cash ? 'Win ' + round.result.finalWin + ' ETB' : round.result.score > 0
    ? '+' + round.result.score + ' points' + (round.result.bonus ? ' · Bonus' : '')
    : 'No match';
  if (remaining > 0 && --remaining > 0) next = setTimeout(startSpin, 360);
  controls();
}

async function startSpin() {
  if (active || connecting || document.hidden || !document.hasFocus()) {
    if (document.hidden || !document.hasFocus()) stopAuto();
    return;
  }
  let result;
  if (cash) {
    connecting = true;
    controls();
    get('status').textContent = 'Confirming with Player wallet…';
    try {
      result = await cash.spin(bet);
    } catch (error) {
      stopAuto();
      if (['PLAYER_LOGIN_REQUIRED','PLAYER_SESSION_CHANGED'].includes(error.message)) cash.invalidate();
      get('status').textContent = error.message === 'INSUFFICIENT_FUNDS' ? 'Insufficient ETB balance.'
        : 'Round unavailable. A retry checks any saved round before starting a new one.';
      return;
    } finally {
      connecting = false;
      controls();
    }
  } else result = deal(game, level);
  const round = { result, revealed: 0, timers: [] };
  active = round;
  get('status').textContent = 'Reels spinning';
  reels.forEach(({ reel }) => reel.classList.add('rolling'));
  let frame = 0;
  round.preview = setInterval(() => {
    ++frame;
    reels.forEach(({ reel }, column) => {
      if (reel.classList.contains('rolling')) {
        paint(column, Array.from({ length: game.rows }, (_, row) => (frame + column * 2 + row) % game.symbols.length));
      }
    });
    get('multiplier').value = game.multipliers[frame % game.multipliers.length] + '×';
  }, 80);
  round.timers = reels.map((_, column) => setTimeout(
    () => reveal(round, column),
    (quick ? 290 : 720) + column * (quick ? 75 : 155),
  ));
  controls();
  note(game.accentNotes[0] / 2, 0.16);
}

function open(title, children) {
  get('dialog-title').textContent = title;
  content.replaceChildren(...children);
  dialog.showModal();
}

function choice(label, choose) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', choose);
  return button;
}

spin.addEventListener('click', () => {
  const round = active;
  if (!round) return startSpin();
  round.timers.forEach(clearTimeout);
  reels.forEach((_, column) => reveal(round, column));
});

auto.addEventListener('click', () => {
  if (remaining > 0) return stopAuto();
  if (active) return;
  const count = document.createElement('select');
  for (const number of [5, 10, 20]) count.add(new Option(number + ' rounds', number));
  const label = document.createElement('label');
  label.append('Rounds ', count);
  open('Autoplay', [label, choice('START PLAY', () => {
    dialog.close();
    remaining = Number(count.value);
    startSpin();
  })]);
});

levelButton.addEventListener('click', () => {
  if (cash) {
    const bets = cash.current?.model.betLevels ?? [];
    if (bets.length) open('Choose a stake', bets.map(value => choice(value + ' ETB', () => {
      bet = value;
      levelButton.textContent = bet + ' ETB';
      dialog.close();
    })));
    return;
  }
  open('Choose a level', [1, 2, 3].map(number => choice('Level ' + number, () => {
    level = number;
    levelButton.textContent = 'Level ' + level;
    dialog.close();
  })));
});

get('rules').addEventListener('click', () => {
  const details = document.createElement('p');
  details.textContent = cash ? 'The Player wallet settles the selected stake and any win. STOP finishes the current animation.'
    : game.description + ' Higher levels multiply points. STOP finishes the current round.';
  open('Rules', [details]);
});

sound.addEventListener('click', async () => {
  enabled = !enabled;
  sound.textContent = enabled ? 'Sound on' : 'Sound off';
  sound.setAttribute('aria-pressed', String(enabled));
  if (!enabled) return silence();
  try {
    audio ??= new AudioContext();
    await audio.resume();
    note(game.accentNotes[0]);
  } catch {
    enabled = false;
    sound.textContent = 'Sound unavailable';
    sound.setAttribute('aria-pressed', 'false');
  }
});

turbo.addEventListener('click', () => {
  quick = !quick;
  turbo.textContent = quick ? 'Turbo on' : 'Turbo off';
  turbo.setAttribute('aria-pressed', String(quick));
});

function silence() {
  for (const voice of voices) voice.stop();
  voices.clear();
}

function pause() {
  stopAuto();
  silence();
}

window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('pagehide', () => { cash?.invalidate(); pause(); });
reels.forEach((_, column) => paint(column, Array.from({ length: game.rows }, (_, row) => (column + row + 1) % game.symbols.length)));
controls();
if (cash) {
  get('score-label').textContent = 'Balance';
  get('mode-label').textContent = 'Player wallet · ETB';
  get('score').value = '—';
  levelButton.textContent = 'BET';
  get('status').textContent = 'Checking Player wallet…';
  cash.connect().then(session => {
    [bet] = session.model.betLevels;
    levelButton.textContent = bet + ' ETB';
    get('score').value = session.balance + ' ETB';
    get('status').textContent = 'Ready';
  }).catch(error => {
    if (error.message === 'PLAYER_LOGIN_REQUIRED') {
      const login = document.createElement('a');
      login.href = '/?login=1&return=' + encodeURIComponent(location.pathname);
      login.textContent = 'Sign in to your Player account';
      get('status').replaceChildren(login);
    } else get('status').textContent = 'This game is not yet registered for ETB.';
  }).finally(controls);
}
