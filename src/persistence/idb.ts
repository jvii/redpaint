// A one-store key/value corner of IndexedDB, which is all the autosave needs.
// Not localStorage: the payload is a raster, and localStorage is ~5MB,
// string-only and synchronous, blocking the main thread the moment a stroke
// ends. IndexedDB takes a Uint8Array as-is.
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

// One connection, held. The last write of a session starts from `pagehide`, and
// one that still has to open a connection asynchronously never lands. The
// document is torn down first. Dropped if the connection goes away, so the next
// call opens a new one.
let connection: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
  if (!connection) {
    connection = openDatabase().then((db): IDBDatabase => {
      db.onclose = (): void => {
        connection = null;
      };
      db.onversionchange = (): void => {
        db.close();
        connection = null;
      };
      return db;
    });
    connection.catch((): void => {
      connection = null;
    });
  }
  return connection;
}

function run<T>(mode: IDBTransactionMode, use: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return database().then(
    (db): Promise<T> =>
      new Promise((resolve, reject): void => {
        const transaction = db.transaction(STORE, mode);
        const request = use(transaction.objectStore(STORE));
        request.onsuccess = (): void => resolve(request.result as T);
        request.onerror = (): void => reject(request.error);
      })
  );
}

// Every call resolves rather than throwing: storage can be unavailable (private
// windows, blocked site data, quota) and a failed read means nothing saved.
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

// Every key in the store, for the caller that prunes.
export async function idbKeys(): Promise<string[]> {
  try {
    return (await run<IDBValidKey[]>('readonly', (store) => store.getAllKeys())).map(String);
  } catch {
    return [];
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(key));
  } catch {
    // nothing to do about it, and nothing depends on it having happened
  }
}
