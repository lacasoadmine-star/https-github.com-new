// Presentation only. Positions are measured in symbol heights, never money.
export const MOTION = Object.freeze({
  multi_hot_5_video: { speed: 12, ramp: 180, stop: 760, stagger: 150 },
  hot_foxy_20: { speed: 14, ramp: 220, stop: 840, stagger: 130 },
  wild_multi_stars: { speed: 13, ramp: 200, stop: 900, stagger: 140 },
});
export function cruising(ms, speed, ramp) {
  const t = Math.max(0, ms) / 1000, a = ramp / 1000;
  return t < a ? { position: speed * t * t / (2 * a), velocity: speed * t / a }
    : { position: speed * (t - a / 2), velocity: speed };
}
export function landing(position, velocity, now, duration, target) {
  const end = target ?? Math.ceil(position + velocity * duration / 2000 + 3);
  return { from: position, to: end, velocity: Math.min(velocity, 3 * (end - position) / (duration / 1000)), start: now, duration };
}
export function sample(plan, now) {
  const t = Math.min(1, Math.max(0, (now - plan.start) / plan.duration));
  const d = plan.duration / 1000, v = plan.velocity * d;
  const position = (2*t*t*t-3*t*t+1)*plan.from + (t*t*t-2*t*t+t)*v + (-2*t*t*t+3*t*t)*plan.to;
  const velocity = ((6*t*t-6*t)*plan.from + (3*t*t-4*t+1)*v + (-6*t*t+6*t)*plan.to) / d;
  return { position, velocity: Math.max(0, velocity), done: t === 1 };
}
