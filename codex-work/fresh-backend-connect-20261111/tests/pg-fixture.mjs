const { PGlite } = await import(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');

const databases = new Map();
const normalize = value => typeof value === 'bigint' ? value.toString() : Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object' && !(value instanceof Date) ? Object.fromEntries(Object.entries(value).map(([key, value]) => [key, normalize(value)])) : value;

export async function memoryDatabase(name) {
  const db = new PGlite();
  await db.waitReady;
  databases.set(name, { db, tail: Promise.resolve() });
  return db;
}

class Pool {
  constructor({ connectionString }) {
    this.fixture = databases.get(connectionString);
    if (!this.fixture) throw Error('ONLY_REGISTERED_IN_MEMORY_DATABASES_ALLOWED');
  }
  on() {}
  async query(input, params) {
    const text = typeof input === 'string' ? input : input.text;
    const result = params === undefined ? (await this.fixture.db.exec(text)).at(-1) : await this.fixture.db.query(text, params);
    const rows = normalize(result?.rows ?? []);
    return { rows, rowCount: rows.length > 0 ? rows.length : result?.affectedRows ?? 0 };
  }
  async connect() {
    let release;
    const previous = this.fixture.tail;
    this.fixture.tail = new Promise(resolve => { release = resolve; });
    await previous;
    return { query: (text, params) => this.query(text, params), release };
  }
  async end() {}
}
export default { Pool };
