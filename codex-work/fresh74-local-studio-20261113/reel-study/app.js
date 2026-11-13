(function () {
  'use strict';
  const source = window.FRESH_REEL_SOURCES;
  const canvas = document.getElementById('stage');
  const context = canvas.getContext('2d', { alpha: false });
  const buttons = Object.fromEntries(['spin','stop','auto','reference','retry'].map(id => [id, document.getElementById(id)]));
  const ui = Object.fromEntries(['state','count','title','grid-label','view-label','auto-count','load-error','provenance'].map(id => [id, document.getElementById(id)]));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current, model, ready = false, reference = false, loadEpoch = 0, frameId = null;
  const images = new Map();
  function readImage(path) {
    if (!images.has(path)) images.set(path, new Promise((resolve,reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = () => { images.delete(path); reject(new Error('Missing local image: ' + path)); }; img.src = path;
    }));
    return images.get(path);
  }
  function status() {
    if (!ready) return;
    const active = model.phase === 'running' || model.phase === 'waiting';
    buttons.spin.disabled = active || reference;
    buttons.auto.disabled = active || reference;
    buttons.stop.disabled = !active;
    buttons.reference.disabled = false;
    ui['auto-count'].disabled = active || reference;
    ui.state.textContent = reference ? 'Sawirkii cusub · tixraac taagan' : active ? (model.autoRemaining ? 'Autoplay · ' + model.autoRemaining + ' ayaa ku xiga' : 'Reels-ku way wareegayaan…') : 'Diyaar · SPIN ama Space taabo';
    ui.count.textContent = model.completed + ' wareeg oo muuqaal ah';
    ui['view-label'].textContent = reference ? 'SAWIR TIXRAAC AH' : 'REELS MAXALLI AH';
    buttons.reference.textContent = reference ? 'Ku noqo reels-ka' : 'Eeg sawirka tixraaca';
    buttons.reference.setAttribute('aria-pressed', String(reference));
  }
  function paint(now) {
    if (!ready || !current || !model) return;
    context.drawImage(current.background, 0, 26, 1070, 660, 0, 0, 1070, 660);
    const frames = model.advance(now);
    if (!reference) {
      const grid = current.grid;
      const w = grid.width / 5, h = grid.height / current.rows;
      frames.forEach((frame, col) => {
        const x = grid.x + col * w + 4, y = grid.y - 26;
        context.save(); context.beginPath(); context.rect(x, y, w - 7, grid.height); context.clip();
        context.fillStyle = '#023428'; context.fillRect(x, y, w - 7, grid.height);
        const first = Math.floor(frame.position);
        for (let row = first; row <= Math.min(frame.strip.length - 1, first + current.rows); row += 1) {
          const symbol = source.symbols[frame.strip[row]];
          const image = current.symbolImages[symbol.asset];
          const rect = symbol.rect;
          context.drawImage(image, rect[0], rect[1], rect[2], rect[3], x, y + (row - frame.position) * h, w - 7, h + .5);
        }
        context.restore();
      });
    }
    status();
  }
  function animate(now) {
    frameId = null;
    paint(now);
    if (ready && !reference && (model.phase === 'running' || model.phase === 'waiting')) frameId = requestAnimationFrame(animate);
  }
  function render() {
    if (frameId === null) frameId = requestAnimationFrame(animate);
  }
  async function select(key) {
    const definition = source.games.find(game => game.id === key) || source.games[0];
    const epoch = ++loadEpoch;
    ready = false; reference = false;
    if (model) model.dispose();
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    Object.values(buttons).forEach(button => { if (button.id !== 'retry') button.disabled = true; });
    ui['load-error'].hidden = true;
    ui.state.textContent = 'Sawirrada cusub ayaa furmaya…';
    ui.title.textContent = definition.name;
    ui['grid-label'].textContent = '5 × ' + definition.rows;
    document.querySelectorAll('[data-game]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.game === definition.id)));
    try {
      const entries = await Promise.all(source.assets.map(async asset => [asset.id, await readImage(asset.path)]));
      if (epoch !== loadEpoch) return;
      const loaded = Object.fromEntries(entries);
      current = { ...definition, background: loaded[definition.asset], symbolImages: loaded };
      model = new window.ReelStudyEngine.Study({ rows: current.rows, grid: current.initialColumns, symbols: Object.keys(source.symbols), reducedMotion: reduced });
      ready = true;
      if (location.hash !== '#' + definition.id) history.replaceState(null, '', '#' + definition.id);
      render();
    } catch (error) {
      if (epoch !== loadEpoch) return;
      ui.state.textContent = 'Faylka sawirka ma furmin; mar kale isku day.';
      ui['load-error'].hidden = false;
      console.error(error.message);
    }
  }
  function spin() { if (ready && !reference && model.spin(performance.now())) render(); }
  buttons.spin.addEventListener('click', spin);
  buttons.stop.addEventListener('click', () => { if (ready) { model.stop(performance.now()); render(); } });
  buttons.auto.addEventListener('click', () => { if (ready && !reference && model.startAuto(Number(ui['auto-count'].value), performance.now())) render(); });
  buttons.reference.addEventListener('click', () => { if (!ready) return; model.stop(performance.now()); model.advance(performance.now() + 2000); reference = !reference; render(); });
  buttons.retry.addEventListener('click', () => select(location.hash.slice(1)));
  document.querySelectorAll('[data-game]').forEach(button => button.addEventListener('click', () => select(button.dataset.game)));
  document.addEventListener('keydown', event => {
    if (event.code === 'Space' && !event.repeat && !/INPUT|SELECT|TEXTAREA|BUTTON|A|SUMMARY/.test(event.target.tagName)) { event.preventDefault(); spin(); }
    if (event.code === 'Escape' && ready) { model.stop(performance.now()); render(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && ready) { model.stop(performance.now()); model.advance(performance.now() + 2000); render(); } });
  window.addEventListener('pagehide', () => { if (model) model.dispose(); if (frameId !== null) cancelAnimationFrame(frameId); });
  window.addEventListener('hashchange', () => select(location.hash.slice(1)));
  source.assets.forEach(asset => {
    const row = document.createElement('div'); row.className = 'source-line';
    const name = document.createElement('strong'); name.textContent = asset.label;
    const path = document.createElement('span'); path.textContent = ' · ' + asset.relativeEvidencePath;
    const hash = document.createElement('code'); hash.textContent = 'SHA-256 ' + asset.sha256;
    row.append(name, path, hash); ui.provenance.append(row);
  });
  select(location.hash.slice(1));
})();
