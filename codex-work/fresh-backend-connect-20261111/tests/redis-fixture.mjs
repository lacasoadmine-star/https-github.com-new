export default class Redis {
  constructor(url) {
    if (url !== 'memory:fixture-only') throw Error('ONLY_IN_MEMORY_REDIS_ALLOWED');
    this.values = new Map();
  }
  on() {}
  async connect() {}
  async ping() { return 'PONG'; }
  async quit() {}
  async set(key, value, expiry, ttl, mode) {
    if (mode !== 'NX' || expiry !== 'PX') throw Error('UNEXPECTED_LOCK_COMMAND');
    if (this.values.has(key)) return null;
    this.values.set(key, value);
    return 'OK';
  }
  async eval(_script, _count, key, owner) {
    if (this.values.get(key) !== owner) return 0;
    this.values.delete(key);
    return 1;
  }
}
