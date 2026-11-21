const escapeText = value => String(value).replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const radians = degrees => degrees * Math.PI / 180;
const point = angle => [160 + 122 * Math.sin(radians(angle)), 160 - 122 * Math.cos(radians(angle))];

// Original presentation geometry, chosen to resemble the observed two-tone
// wheel. Sector areas are decorative; they are not a probability specification.
export function visualArc(targetBps) {
  if (![14_000, 20_000].includes(targetBps)) throw new TypeError('Unverified presentation target.');
  return targetBps === 20_000 ? 180 : 250;
}
export function sectorPath(arc) {
  const [x, y] = point(arc);
  return 'M160 160 L160 38 A122 122 0 ' + (arc > 180 ? 1 : 0) + ' 1 ' + x.toFixed(3) + ' ' + y.toFixed(3) + ' Z';
}
export function settledAngle(sector, targetBps) {
  const arc = visualArc(targetBps);
  if (sector === 'green') return (360 - arc / 2) % 360;
  if (sector === 'empty') return (360 - (arc + (360 - arc) / 2)) % 360;
  throw new TypeError('A server-settled green or empty sector is required.');
}

export function wheelMarkup({ targetBps = 14_000, angle = 0, label = 'ROLL X', amount = '', fixture = false } = {}) {
  if (!Number.isFinite(angle)) throw new TypeError('Finite presentation angle required.');
  const arc = visualArc(targetBps);
  const fontSize = Math.max(14, Math.min(31, 214 / Math.max(1, amount.length * 0.61)));
  return '<svg viewBox="0 0 320 354" role="img" aria-label="Roll X wheel" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><radialGradient id="rollx-disc"><stop stop-color="#292e30"/><stop offset="1" stop-color="#101416"/></radialGradient>' +
    '<linearGradient id="rollx-green" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#83ed8b"/><stop offset="1" stop-color="#37a65c"/></linearGradient>' +
    '<filter id="rollx-shadow"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-opacity=".25"/></filter></defs>' +
    '<circle cx="160" cy="160" r="130" fill="#0c1112" stroke="#3b4345" stroke-width="2" filter="url(#rollx-shadow)"/>' +
    '<g data-wheel-disc="" transform="rotate(' + angle.toFixed(3) + ' 160 160)">' +
    '<circle cx="160" cy="160" r="122" fill="url(#rollx-disc)"/>' +
    '<path data-green-sector="" d="' + sectorPath(arc) + '" fill="url(#rollx-green)"/></g>' +
    '<path d="M148 24 L172 24 L160 47 Z" fill="#f0f7ef" stroke="#ffffff" stroke-width="1.3"/>' +
    '<text data-result-label="" x="160" y="148" text-anchor="middle" fill="#eaf5e9" font-family="Arial,sans-serif" font-weight="700" font-size="18">' + escapeText(label) + '</text>' +
    '<text data-result-amount="" x="160" y="181" text-anchor="middle" fill="#ffffff" font-family="Arial,sans-serif" font-weight="750" font-size="' + fontSize.toFixed(1) + '">' + escapeText(amount) + '</text>' +
    '<text x="160" y="324" text-anchor="middle" fill="#9aacaa" font-family="Arial,sans-serif" font-size="11">' +
    (fixture ? 'ISOLATED TEST · NO REAL MONEY' : 'ZPLAY · ORIGINAL PRESENTATION') + '</text></svg>';
}

export class RollXRenderer {
  constructor({ element, requestFrame = callback => requestAnimationFrame(callback),
    cancelFrame = id => cancelAnimationFrame(id), now = () => performance.now() } = {}) {
    if (!element) throw new TypeError('A wheel element is required.');
    Object.assign(this, { element, requestFrame, cancelFrame, now });
    this.angle = 0; this.targetBps = 14_000; this.frame = null; this.animation = null; this.disposed = false;
    this.fixture = false;
    this.draw();
  }
  draw(label = 'ROLL X', amount = '') {
    if (this.disposed) return;
    this.element.innerHTML = wheelMarkup({ angle: this.angle, targetBps: this.targetBps, label, amount, fixture: this.fixture });
  }
  setPreview(targetBps, fixture = false) {
    const fixtureChanged = this.fixture !== fixture;
    this.fixture = fixture;
    if (this.animation || this.disposed || targetBps === this.targetBps && !fixtureChanged) return;
    this.targetBps = targetBps; this.angle = 0; this.draw();
  }
  _end(cancelled = false) {
    const animation = this.animation;
    if (!animation) return;
    if (this.frame !== null) this.cancelFrame(this.frame);
    this.frame = null; this.animation = null;
    animation.signal?.removeEventListener('abort', animation.abort);
    if (!cancelled && !this.disposed) {
      this.angle = animation.finalAngle;
      this.draw(animation.receipt.rollX.sector === 'green' ? 'WIN CONFIRMED' : 'ROUND COMPLETE',
        animation.receipt.finalWin + ' ETB');
    }
    animation.resolve({ cancelled });
  }
  presentReceipt(receipt, { duration = 1500, signal, onTick = () => {} } = {}) {
    if (this.disposed || signal?.aborted) return Promise.resolve({ cancelled: true });
    if (!receipt?.rollX || !['green', 'empty'].includes(receipt.rollX.sector)) throw new TypeError('Server receipt required.');
    this._end(true);
    this.targetBps = receipt.rollX.targetBps;
    const endpoint = settledAngle(receipt.rollX.sector, receipt.rollX.targetBps);
    const starting = this.angle;
    const finalAngle = Math.ceil(starting / 360) * 360 + 4 * 360 + endpoint;
    return new Promise(resolve => {
      const animation = { receipt, resolve, signal, finalAngle, started: this.now(), previousTick: -1,
        abort: () => this._end(true) };
      this.animation = animation;
      signal?.addEventListener('abort', animation.abort, { once: true });
      if (duration <= 0) { this._end(); return; }
      this.draw('CONFIRMED ROUND', '');
      const frame = timestamp => {
        if (this.disposed || this.animation !== animation) return;
        const fraction = Math.max(0, Math.min(1, (timestamp - animation.started) / duration));
        const ease = 1 - (1 - fraction) ** 3;
        this.angle = starting + (finalAngle - starting) * ease;
        const group = this.element.querySelector('[data-wheel-disc]');
        if (group) group.setAttribute('transform', 'rotate(' + this.angle.toFixed(3) + ' 160 160)');
        const tick = Math.floor(ease * 24);
        if (tick !== animation.previousTick) { animation.previousTick = tick; onTick(); }
        if (fraction >= 1) this._end();
        else this.frame = this.requestFrame(frame);
      };
      this.frame = this.requestFrame(frame);
    });
  }
  finishPresentation() { this._end(); }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this._end(true);
    if (this.frame !== null) this.cancelFrame(this.frame);
    this.frame = null;
  }
}
