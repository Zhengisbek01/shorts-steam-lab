// Tiny IndexedDB key/value store for demo-mode media blobs.
const DB = 'ssl-demo-media';
const STORE = 'files';
let dbPromise;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx(mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = fn(store);
        t.oncomplete = () => resolve(req && req.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

export const idbPut = (key, blob) => tx('readwrite', (s) => s.put(blob, key));
export const idbGet = (key) => tx('readonly', (s) => s.get(key));
export const idbDel = (key) => tx('readwrite', (s) => s.delete(key));
