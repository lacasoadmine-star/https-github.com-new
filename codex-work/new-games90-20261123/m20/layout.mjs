import { CONTROLS, VIEW } from './render/layout.mjs';

/** Responsive adaptation; desktop uses this game's measured native coordinates. */
export function presentationLayout(width, height) {
  if (!Number.isFinite(width) || width < 240 || !Number.isFinite(height) || height < 240) throw new RangeError('M20_VIEWPORT');
  const portrait = width < 700;
  const crop = portrait ? { x: 310, y: 0, width: 724, height: 740 } : { x: 0, y: 0, width: VIEW.width, height: VIEW.height };
  const scale = Math.min(width / crop.width, portrait ? 1 : height / crop.height);
  const scene = { width: crop.width * scale, height: crop.height * scale };
  const controls = portrait ? {
    menu: { x: 0, y: scene.height + 8, width: width / 5, height: 48 },
    sound: { x: width / 5, y: scene.height + 8, width: width / 5, height: 48 },
    quick: { x: 2 * width / 5, y: scene.height + 8, width: width / 5, height: 48 },
    bet: { x: 3 * width / 5, y: scene.height + 8, width: width / 5, height: 48 },
    auto: { x: 4 * width / 5, y: scene.height + 8, width: width / 5, height: 48 },
    double: { x: 0, y: scene.height + 64, width: width / 4, height: 64 },
    spin: { x: width / 4, y: scene.height + 64, width: width / 2, height: 64 },
    take: { x: 3 * width / 4, y: scene.height + 64, width: width / 4, height: 64 },
  } : Object.fromEntries(Object.entries(CONTROLS).map(([name, r]) => [name, {
    x: r.x * scale, y: r.y * scale, width: Math.max(44, r.width * scale), height: Math.max(44, r.height * scale),
  }]));
  if (!portrait) {
    // The retained rectangular QUICK hitbox overlapped the main circular control.
    // Keep its enlarged accessible target outside SPIN rather than intercepting it.
    const q = controls.quick, spin = controls.spin;
    if (spin.x + spin.width + 2 + q.width <= scene.width) q.x = spin.x + spin.width + 2;
    else q.y = spin.y - q.height - 2;
  }
  return Object.freeze({ portrait, crop: Object.freeze(crop), scene: Object.freeze(scene), scale,
    width: portrait ? width : scene.width, height: scene.height + (portrait ? 136 : 0), controls: Object.freeze(controls) });
}
