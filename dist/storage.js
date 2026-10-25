export const DATABASE_NAME = 'pocket.expenses';
const STORE = 'state';
const STATE_KEY = 'current';
const LEGACY_KEY = 'pocket.expenses.v1';

export class StorageConflictError extends Error {
  constructor() { super('Expenses changed in another tab. Please try saving again.'); this.name = 'StorageConflictError'; }
}

// One atomic record keeps expenses, categories and their photo Blobs in sync.
// Existing localStorage data is copied only after IndexedDB commits successfully.
export function createExpenseRepository(seedState) {
  let database;
  function open() {
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onerror = () => { database = undefined; reject(request.error); };
      request.onblocked = () => { database = undefined; reject(new Error('Close older Pocket tabs and try again.')); };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); database = undefined; };
        resolve(db);
      };
    });
    return database;
  }
  async function transaction(mode, operation) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let value, failure;
      const request = tx.objectStore(STORE).get(STATE_KEY);
      request.onsuccess = () => {
        try { value = operation(request.result, tx.objectStore(STORE)); }
        catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = () => resolve(value);
      tx.onabort = tx.onerror = () => reject(failure || tx.error || request.error || new Error('Could not save expenses.'));
    });
  }
  return {
    async load() {
      const existing = await transaction('readonly', value => value);
      if (existing) return existing;
      const raw = localStorage.getItem(LEGACY_KEY);
      const legacy = raw ? JSON.parse(raw) : seedState();
      if (legacy.version !== 1 || !Array.isArray(legacy.expenses) || !Array.isArray(legacy.categories)) throw new Error('Unrecognized expense data');
      const migrated = {...legacy, version:2, revision:0, expenses:legacy.expenses.map(e => ({...e, photos:e.photos || []}))};
      return transaction('readwrite', (current, store) => {
        if (current) return current;
        store.put(migrated, STATE_KEY);
        return migrated;
      });
    },
    async save(state) {
      return transaction('readwrite', (current, store) => {
        if (!current || current.revision !== state.revision) throw new StorageConflictError();
        const next = {...state, version:2, revision:current.revision + 1};
        store.put(next, STATE_KEY);
        return next;
      });
    }
  };
}
