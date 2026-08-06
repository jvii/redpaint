// A minimal in-memory stand-in for the slice of IndexedDB that idb.ts uses,
// so the persistence layer can be tested without a browser.
//
// Hand-rolled rather than pulling in fake-indexeddb, for the reason idb.ts
// itself gives for not using idb-keyval: the surface is small enough to see the
// whole of, and this repo already writes its own PNG codec for tests.
//
// What it models: open (with onupgradeneeded on first open), a single object
// store, get/put/delete/getAllKeys, and the request/callback shape those use.
// What it does NOT model: real transaction isolation or ordering, versionchange
// beyond the first open, quota, or structured-clone semantics — values are
// stored by reference. So it exercises *our* logic, not IndexedDB's; a test
// that would only pass because of one of those gaps is testing the fake.
type Store = Map<string, unknown>;

const databases = new Map<string, Map<string, Store>>();

// Requests resolve on a later microtask, as the real ones do asynchronously —
// enough to catch code that reads a result before its handler has run.
function request<T>(produce: () => T): { onsuccess: unknown; onerror: unknown; result: T } {
  const req = { onsuccess: null, onerror: null, result: undefined } as {
    onsuccess: (() => void) | null;
    onerror: (() => void) | null;
    result: T;
    error: unknown;
  };
  queueMicrotask((): void => {
    try {
      req.result = produce();
      req.onsuccess?.();
    } catch (error) {
      req.error = error;
      req.onerror?.();
    }
  });
  return req as never;
}

function makeDatabase(name: string, stores: Map<string, Store>): IDBDatabase {
  return {
    name,
    close: (): void => undefined,
    onclose: null,
    onversionchange: null,
    createObjectStore: (storeName: string): unknown => {
      stores.set(storeName, new Map());
      return {};
    },
    transaction: (storeName: string): unknown => {
      const store = stores.get(storeName);
      if (!store) {
        throw new Error(`no such store: ${storeName}`);
      }
      return {
        objectStore: (): unknown => ({
          get: (key: string) => request(() => store.get(key)),
          put: (value: unknown, key: string) => request(() => void store.set(key, value)),
          delete: (key: string) => request(() => void store.delete(key)),
          getAllKeys: () => request(() => [...store.keys()]),
        }),
        oncomplete: null,
      };
    },
  } as unknown as IDBDatabase;
}

// Installs the fake as globalThis.indexedDB. Returns a handle for inspecting
// and seeding the store directly, which is how a test sets up "a record left by
// another tab" without going through the code under test.
export function installFakeIndexedDb(databaseName = 'redpaint', storeName = 'document') {
  const stores = new Map<string, Store>();
  databases.set(databaseName, stores);

  const open = (name: string): unknown => {
    const req = {
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      result: undefined,
    } as {
      onupgradeneeded: (() => void) | null;
      onsuccess: (() => void) | null;
      onerror: (() => void) | null;
      result: IDBDatabase;
    };
    queueMicrotask((): void => {
      const fresh = !stores.has(storeName);
      req.result = makeDatabase(name, stores);
      if (fresh) {
        req.onupgradeneeded?.();
      }
      req.onsuccess?.();
    });
    return req;
  };

  (globalThis as { indexedDB?: unknown }).indexedDB = { open };

  return {
    // direct access, bypassing the code under test
    seed(key: string, value: unknown): void {
      if (!stores.has(storeName)) {
        stores.set(storeName, new Map());
      }
      stores.get(storeName)!.set(key, value);
    },
    keys(): string[] {
      return [...(stores.get(storeName)?.keys() ?? [])].sort();
    },
    get(key: string): unknown {
      return stores.get(storeName)?.get(key);
    },
    uninstall(): void {
      delete (globalThis as { indexedDB?: unknown }).indexedDB;
      databases.delete(databaseName);
    },
  };
}
