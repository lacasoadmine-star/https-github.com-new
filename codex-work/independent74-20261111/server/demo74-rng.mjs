// Worker-only cryptographic RNG shim. No Node polyfill or browser outcome code.
export function secureUnitRandom() {
  const words = crypto.getRandomValues(new Uint32Array(2));
  return ((words[0] & 0x1fffff) * 4294967296 + words[1]) / 9007199254740992;
}

export function randomInt(min, max) {
  if (max === undefined) { max = min; min = 0; }
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min < 0 || max <= min || max - min > 281474976710656) throw new RangeError('Invalid random integer interval.');
  const bound = max - min, range = 9007199254740992;
  const limit = Math.floor(range / bound) * bound;
  for (;;) {
    const sample = Math.floor(secureUnitRandom() * range);
    if (sample < limit) return min + sample % bound;
  }
}
