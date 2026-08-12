// Which tab this is, so each one owns its own autosave record. sessionStorage
// survives a reload and dies with the tab, so a reload finds its own record and
// a new tab finds none.
const TAB_KEY = 'redpaint.tabId';

// sessionStorage is *copied* by Duplicate Tab, window.open and opening a link,
// so an inherited id may already belong to a live tab. A Web Lock named for the
// id answers that by construction: held for the life of the document, released
// by the browser when it is destroyed, and `ifAvailable` answers immediately.
//
// Do not replace this with a heartbeat registry or a broadcast question. Both
// were tried and both are wrong on exactly the cases this exists for
// (docs/gotchas.md, "Tab identity").
const LOCK_PREFIX = 'redpaint.tab.';

function newId(): string {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(36).slice(2);
}

let claimed: string | null = null;

// False when a live document already holds the id. The callback's promise is
// never settled, so the lock is held for the life of this document.
function claim(id: string): Promise<boolean> {
  if (!navigator.locks) {
    return Promise.resolve(true); // no way to ask; assume it is ours, as it usually is
  }
  return new Promise<boolean>((resolve): void => {
    void navigator.locks
      .request(LOCK_PREFIX + id, { ifAvailable: true }, (lock): Promise<void> => {
        resolve(lock !== null);
        return lock ? new Promise<void>((): void => undefined) : Promise.resolve();
      })
      .catch((): void => resolve(true));
  });
}

// Settled once per page load. The inherited id is kept unless a live document
// holds its lock, which is the only thing that means we were copied.
export async function ensureTabId(): Promise<string> {
  if (claimed) {
    return claimed;
  }
  let inherited: string | null = null;
  try {
    inherited = window.sessionStorage.getItem(TAB_KEY);
  } catch {
    // storage blocked: behaves as a new tab each load, saves, never restores
  }
  let id = inherited ?? newId();
  if (!(await claim(id))) {
    id = newId(); // a live document holds it: we are the copy
    await claim(id); // a fresh uuid, so uncontended
  }
  if (id !== inherited) {
    try {
      window.sessionStorage.setItem(TAB_KEY, id);
    } catch {
      // see above
    }
  }
  claimed = id;
  return id;
}

// The settled id, or the inherited one if a save somehow beat the restore: the
// same answer except in a duplicated tab.
export function tabId(): string {
  if (claimed) {
    return claimed;
  }
  try {
    return window.sessionStorage.getItem(TAB_KEY) ?? 'unclaimed';
  } catch {
    return 'unclaimed';
  }
}
