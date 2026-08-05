// A one-store key/value corner of IndexedDB, which is all the autosave needs.
//
// Hand-rolled rather than idb-keyval: the whole surface is get/set/delete on a
// single store, and this codebase already writes its own ILBM and PNG codecs
// rather than taking a dependency for something it can see the whole of.
//
// IndexedDB and not localStorage because the payload is a raster: localStorage
// is ~5 MB, synchronous, and string-only (base64 costs another third), and the
// write happens the moment a stroke ends — the worst possible time to block the
// main thread. IndexedDB takes a Uint8Array as-is, asynchronously.
const DATABASE = 'redpaint';
const STORE = 'document';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject): void => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = (): void => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void => reject(request.error);
  });
}

function run<T>(mode: IDBTransactionMode, use: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDatabase().then(
    (database): Promise<T> =>
      new Promise((resolve, reject): void => {
        const transaction = database.transaction(STORE, mode);
        const request = use(transaction.objectStore(STORE));
        request.onsuccess = (): void => resolve(request.result as T);
        request.onerror = (): void => reject(request.error);
        transaction.oncomplete = (): void => database.close();
      })
  );
}

// Every call resolves rather than throwing: storage can be unavailable
// (private windows, blocked site data, a quota refusal) and none of that is
// worth breaking a paint program over. The caller treats an absent value and a
// failed read the same way — as nothing saved.
export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    return ((await run<T | undefined>('readonly', (store) => store.get(key))) ?? null) as T | null;
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: unknown): Promise<boolean> {
  try {
    await run('readwrite', (store) => store.put(value, key));
    return true;
  } catch {
    return false;
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(key));
  } catch {
    // nothing to do about it, and nothing depends on it having happened
  }
}
