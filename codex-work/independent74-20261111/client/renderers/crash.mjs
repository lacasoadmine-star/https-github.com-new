/** Decorative clock-crash display. Financial state always comes from the server. */
export function mountCrash(container, {game, reducedMotion = false, audio, onStatus = () => {}}) {
  container.replaceChildren();
  const root = document.createElement('div'); root.className = 'crash-scene';
  root.innerHTML = '<canvas aria-hidden="true"></canvas><div class="crash-scene-label"><span>PRISM PULSE</span><small>INDEPENDENT CLOCK SERIES</small></div><div class="crash-counter" role="status"><strong>1.00×</strong><span>Ready when you are</span></div><p class="crash-clock-note">Live visual · collection is confirmed at server time</p>';
  container.append(root);
  root.querySelector('.crash-scene-label>span').textContent = game.theme?.name?.toUpperCase() || 'PRISM PULSE';
  const canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d');
  const counter = root.querySelector('.crash-counter strong'), label = root.querySelector('.crash-counter>span');
  const color = game.theme?.colors?.[1] || '#e879f9', secondary = game.theme?.colors?.[2] || '#fbbf24';
  let width = 600, height = 400, frame, round = null, synchronizedAt = 0, destroyed = false, pulse = 0;
  const resize = () => {
    const size = root.getBoundingClientRect(); width = Math.max(1, size.width); height = Math.max(1, size.height);
    const ratio = Math.min(2, devicePixelRatio || 1); canvas.width = width * ratio; canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const observer = new ResizeObserver(resize); observer.observe(root); resize();
  function draw(now = performance.now()) {
    if (destroyed) return;
    const active = round?.status === 'active';
    const elapsed = active && !round.pendingResolution ? Math.max(0, now - synchronizedAt) : 0;
    const displayed = active ? Math.min(round.maxMultiplierBps || 1000000, Number(round.multiplierBps) + Math.floor(elapsed * Number(round.growthBpsPerSecond || 0) / 1000)) : Number(round?.bustMultiplierBps || round?.multiplierBps || 10000);
    counter.textContent = (displayed / 10000).toFixed(2) + '×';
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createRadialGradient(width * .5, height * .4, 0, width * .5, height * .4, width * .85);
    bg.addColorStop(0, game.theme?.colors?.[0] || '#38155d'); bg.addColorStop(1, '#0c1625'); ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#ead5ff0b'; ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 0; y < height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    const progress = active ? Math.min(.95, Math.log2(Math.max(1, displayed / 10000)) / 7 + .10) : round ? Math.min(.95, Math.log2(Math.max(1, displayed / 10000)) / 7 + .10) : .1;
    const x = width * (.13 + .73 * progress), y = height * (.77 - .58 * progress);
    ctx.beginPath(); ctx.moveTo(width * .06, height * .85); ctx.quadraticCurveTo(width * .42, height * .85, x, y);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
    const t = reducedMotion ? 0 : now / 1100; const radius = Math.max(18, Math.min(35, width * .06));
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * .2);
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const angle = Math.PI * i / 4; const r = i % 2 ? radius * .55 : radius; const xx = Math.cos(angle) * r, yy = Math.sin(angle) * r; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.closePath();
    const gem = ctx.createLinearGradient(-radius, -radius, radius, radius); gem.addColorStop(0, '#fff2f9'); gem.addColorStop(.4, color); gem.addColorStop(1, '#7342ba');
    ctx.fillStyle = gem; ctx.shadowColor = color; ctx.shadowBlur = active ? 25 : 12; ctx.fill(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(-radius, 0); ctx.lineTo(radius, 0); ctx.moveTo(0, -radius); ctx.lineTo(0, radius); ctx.strokeStyle = '#ffffff65'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    if (round?.status === 'lost') { ctx.strokeStyle = secondary; ctx.lineWidth = 2; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(x + Math.cos(a)*radius*1.3,y+Math.sin(a)*radius*1.3);ctx.lineTo(x+Math.cos(a)*radius*1.9,y+Math.sin(a)*radius*1.9);ctx.stroke(); } }
    for (let i = 0; i < 26; i++) { const xx = (i * 113.7) % width, yy = (i * 67.3) % height; ctx.fillStyle = i%3 ? '#e7d3ff38' : '#ffe6a96b'; ctx.beginPath(); ctx.arc(xx, yy, i%3 ? 1 : 1.6, 0, Math.PI*2); ctx.fill(); }
    if (active && !reducedMotion) { pulse++; if (pulse % 2 === 0) frame = requestAnimationFrame(draw); else frame = requestAnimationFrame(draw); }
  }
  const show = async value => {
    if (!value || value.family !== 'crash' || !Number.isFinite(Number(value.multiplierBps))) throw new Error('The server crash state is unavailable.');
    cancelAnimationFrame(frame); round = value; synchronizedAt = performance.now();
    root.dataset.status = value.status;
    label.textContent = value.pendingResolution ? 'Confirming round outcome…' : value.status === 'active' ? 'Collect before the pulse ends' : value.status === 'collected' ? 'Collection confirmed' : 'Pulse ended';
    onStatus(label.textContent); draw();
  };
  draw();
  return {
    start() { label.textContent = 'Confirming your stake…'; audio?.play('start'); },
    show,
    stop() { /* This renderer never changes the clock or a financial result. */ },
    destroy() { destroyed = true; cancelAnimationFrame(frame); observer.disconnect(); container.replaceChildren(); },
  };
}
