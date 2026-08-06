// Which tab this is, so each one can own its own autosave record.
//
// Two tabs share IndexedDB, so a single key meant whichever painted last owned
// the backup and the other tab's was gone — and a reloaded tab got back
// whatever its neighbour had been doing rather than its own picture.
//
// The id lives in sessionStorage: unique per tab, survives that tab's reloads,
// dies with it. So a reload finds its own record, and a genuinely new tab finds
// none.
const TAB_KEY = 'redpaint.tabId';

// sessionStorage is not quite per tab, which is the whole difficulty here.
// Duplicate Tab, window.open and opening a link all *copy* it, so a new tab can
// arrive holding an id another tab is already painting under, and the two would
// share a record.
//
// A Web Lock settles it by construction. Each tab holds a lock named for its id
// for as long as its document lives, and the browser releases it when that
// document is destroyed. So `ifAvailable` answers the only question that
// matters — is a live document already using this id — immediately, with no
// protocol, no timeout, and nothing left behind to clean up.
//
// Both earlier attempts failed by trying to infer that answer instead:
//
//   A heartbeat registry in localStorage, read-modify-written by every tab. A
//   tab releasing its claim on reload had it written straight back by another
//   tab's heartbeat mid-flight, so it returned, believed itself a duplicate,
//   and lost its own record on every single reload.
//
//   A BroadcastChannel question with a 250ms reply window. The document being
//   replaced was still alive to answer, so a reloading tab reported itself as
//   its own duplicate. Closing the responder on pagehide helped, and a
//   navigation-type check — only a fresh navigation can be a copy — avoided
//   asking on reload. But Duplicate Tab restores the session history, so its
//   navigation type is `reload`: the copy skipped the check and adopted the
//   original's record. The heuristic was wrong in precisely the case it existed
//   to catch.
//
// A lock has no window in which to be wrong: it is held or it is not, and the
// answer comes back without waiting for anyone.
const LOCK_PREFIX = 'redpaint.tab.';

function newId(): string {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(36).slice(2);
}

let claimed: string | null = null;

// Takes the lock for an id, or reports false when a live document holds it.
// The callback's promise is deliberately never settled, so the lock is held for
// the life of this document — there is no release to arrange, or to forget.
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

// This tab's id, settled once per page load. The inherited id is kept unless a
// live document already holds its lock, which is the only thing that means we
// were copied — so an ordinary reload keeps its id, and its record.
export async function ensureTabId(): Promise<string> {
  if (claimed) {
    return claimed;
  }
  let inherited: string | null = null;
  try {
    inherited = window.sessionStorage.getItem(TAB_KEY);
  } catch {
    // storage blocked: this tab cannot keep an identity across reloads, so it
    // behaves like a new one each time — it still saves, it just never restores
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

// The settled id, or the best guess at it before ensureTabId has run. Callers
// reach this only if a save somehow beat the restore; the inherited id is the
// same answer in every case but a duplicated tab.
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
