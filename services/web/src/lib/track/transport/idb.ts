/**
 * IndexedDB outbox for the tracking SDK.
 *
 * Persists serialized envelope bodies keyed by batch id. After a successful
 * send the batch is deleted; failed/abandoned sends survive page reloads and
 * are replayed on next mount. Everything degrades silently — if IDB is
 * blocked (private browsing, quota, Safari edge cases) the SDK keeps
 * working in memory-only mode.
 */
const DB_NAME = 'mio-track-v1';
const STORE = 'outbox';
const VERSION = 1;
const CAP = 1000;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('idb-unavailable'));
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export type OutboxRow = { id: string; body: string; ts: number };

export async function persistBatch(row: OutboxRow): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* silent */ }
}

export async function deleteBatch(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* silent */ }
}

export async function loadOutbox(): Promise<OutboxRow[]> {
  try {
    const db = await openDB();
    return await new Promise<OutboxRow[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll(undefined, CAP);
      req.onsuccess = () => resolve((req.result as OutboxRow[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch { return []; }
}

/** Best-effort prune of rows older than the cutoff. */
export async function prune(maxAgeMs: number): Promise<number> {
  const cutoff = Date.now() - maxAgeMs;
  try {
    const db = await openDB();
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.openCursor();
      let n = 0;
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return;
        const row = cur.value as OutboxRow;
        if (row.ts < cutoff) { cur.delete(); n += 1; }
        cur.continue();
      };
      tx.oncomplete = () => resolve(n);
      tx.onerror = () => reject(tx.error);
    });
  } catch { return 0; }
}
