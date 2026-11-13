// Stores only an unresolved request identity, never a wallet balance or outcome.
// Transactions serialize claims from separate tabs for the same signed-in account.
export function createRoundJournal({accountId, indexedDB, databaseName = 'zplay-round-intents-v1'}) {
  if (typeof accountId !== 'string' || !accountId || !indexedDB?.open)
    throw new TypeError('An authenticated account identity and IndexedDB are required');
  let database;
  function open() {
    if (database) return database;
    database = new Promise((resolve, reject) => {
      let failed = false;
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('intents')) request.result.createObjectStore('intents');
      };
      request.onerror = () => {failed = true; reject(request.error);};
      request.onblocked = () => {failed = true; reject(new Error('Round journal is blocked by another tab'));};
      request.onsuccess = () => {
        const db = request.result;
        if (failed) {db.close(); return;}
        db.onversionchange = () => {db.close(); database = null;};
        resolve(db);
      };
    }).catch(error => {database = null; throw error;});
    return database;
  }
  async function transaction(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('intents', mode), store = tx.objectStore('intents');
      let value, failure;
      tx.oncomplete = () => resolve(value);
      tx.onabort = () => reject(failure || tx.error || new Error('Round journal transaction aborted'));
      tx.onerror = () => {failure ||= tx.error;};
      const fail = error => {failure = error; tx.abort();};
      try {action(store, result => {value = result;}, fail);} catch (error) {fail(error);}
    });
  }
  return {
    load() {
      return transaction('readonly', (store, done, fail) => {
        const request = store.get(accountId);
        request.onsuccess = () => {
          try {done(request.result ? validateIntent(request.result) : null);} catch (error) {fail(error);}
        };
      });
    },
    claim(intent) {
      const record = validateIntent(intent);
      return transaction('readwrite', (store, done, fail) => {
        const request = store.get(accountId);
        request.onsuccess = () => {
          if (request.result) {
            const error = new Error('An unresolved round already exists for this account');
            error.code = 'PENDING_ROUND'; error.pending = request.result; fail(error); return;
          }
          store.put(record, accountId); done(record);
        };
      });
    },
    release(roundId) {
      if (typeof roundId !== 'string' || !roundId) throw new TypeError('Round identity is required');
      return transaction('readwrite', (store, done, fail) => {
        const request = store.get(accountId);
        request.onsuccess = () => {
          if (request.result && request.result.roundId !== roundId) {fail(new Error('A different pending round must not be removed')); return;}
          if (request.result) store.delete(accountId);
          done(true);
        };
      });
    },
    async close() {if (database) {const db = await database; db.close(); database = null;}}
  };
}

function validateIntent(intent) {
  if (!intent || typeof intent.gameId !== 'string' || !intent.gameId ||
      typeof intent.roundId !== 'string' || !intent.roundId ||
      !Number.isSafeInteger(intent.betMinor) || intent.betMinor <= 0)
    throw new TypeError('Malformed pending round');
  // Explicit field selection prevents credentials, balances and results leaking in.
  return Object.freeze({gameId: intent.gameId, roundId: intent.roundId, betMinor: intent.betMinor});
}
