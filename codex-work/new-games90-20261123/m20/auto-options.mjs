import { AUTO_COUNTS, moneyMinor } from './controls.mjs';

// The three labels come from this title's retained current control-state evidence.
export const AUTO_LIMIT_FIELDS = Object.freeze([
  Object.freeze({ name: 'winLimit', label: 'If a win reaches or exceeds' }),
  Object.freeze({ name: 'decreaseLimit', label: 'If balance decreases' }),
  Object.freeze({ name: 'increaseLimit', label: 'If balance increases' })
]);

/** Interpret user-entered limits; never derive or modify a host wallet balance. */
export function readAutoOptions(panel) {
  const count = Number(panel.querySelector('[data-auto-count]')?.value);
  if (!AUTO_COUNTS.includes(count)) throw new Error('M20_AUTO_CONFIGURATION_INVALID');
  const options = { count };
  for (const { name } of AUTO_LIMIT_FIELDS) {
    const enabled = panel.querySelector(`[data-auto-enabled="${name}"]`);
    if (!enabled?.checked) { options[name] = null; continue; }
    const field = panel.querySelector(`[data-auto-limit="${name}"]`), value = String(field?.value ?? '').trim();
    if (!/^(0|[1-9]\d{0,10})(?:\.\d{1,2})?$/.test(value)) {
      field?.focus(); throw new Error('M20_AUTO_POSITIVE_AMOUNT_REQUIRED');
    }
    const [whole, decimal = ''] = value.split('.'), canonical = `${whole}.${decimal.padEnd(2, '0')}`;
    moneyMinor(canonical, { positive: true }); options[name] = canonical;
  }
  return options;
}
