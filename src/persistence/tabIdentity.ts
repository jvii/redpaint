// Which tab this is, so each one can own its own autosave record.
//
// Two tabs share IndexedDB, so a single key meant whichever painted last owned
// the backup and the other tab's was gone — and a reloaded tab got back
// whatever its neighbour had been doing rather than its own picture.
//
// The id lives in sessionStorage, which is the piece that makes this work: it
// is unique per tab, it survives a reload of that tab, and it goes away when
// the tab does. So a reload finds its own record, and a genuinely new tab finds
// none.
const TAB_KEY = 'redpaint.tabId';

// Whether an id we inherited is already being painted under by a live tab.
//
// sessionStorage is not quite per tab: duplicating a tab, or opening one from a
// link or window.open, copies it — so a new tab can arrive holding an id
// another tab is already using, and the two would share a record.
//
// Asked over a BroadcastChannel rather than tracked in storage. The first
// attempt kept a registry of live ids in localStorage, which every tab
// read-modify-wrote: a tab releasing its claim on reload had it written straight
// back by another tab's heartbeat mid-flight, so it came back, believed itself a
// duplicate, and minted a new id — losing its own record every single reload.
// A question asked of the tabs themselves cannot go stale, cannot race, and
// leaves nothing behind to clean up.
const CHANNEL = 'redpaint.tabs';
// Long enough for a live tab to answer, short enough not to hold up the restore.
const REPLY_WAIT_MS = 250;

function newId(): string {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(36).slice(2);
}

let claimed: string | null = null;
let responder: BroadcastChannel | null = null;

// Answers "is anyone using this id?" for as long as this tab is open. Started
// once the id is settled, so a tab never answers on behalf of an id it is about
// to give up.
function startResponding(id: string): void {
  if (responder || typeof BroadcastChannel === 'undefined') {
    return;
  }
  responder = new BroadcastChannel(CHANNEL);
  responder.onmessage = (event): void => {
    if (event.data?.type === 'in-use?' && event.data.id === id) {
      responder?.postMessage({ type: 'in-use', id });
    }
  };
  // Stop answering the moment this document starts going away. On a reload the
  // next document asks about the very id this one is holding, and this one is
  // still alive to answer — so it would report itself as a live duplicate, and
  // the reloaded tab would mint a new id and lose its own record. Every time.
  window.addEventListener('pagehide', (): void => {
    responder?.close();
    responder = null;
  });
}

async function isIdLive(id: string): Promise<boolean> {
  if (typeof BroadcastChannel === 'undefined') {
    return false; // no way to ask; assume it is ours, which it usually is
  }
  const channel = new BroadcastChannel(CHANNEL);
  try {
    return await new Promise<boolean>((resolve): void => {
      const timer = window.setTimeout((): void => resolve(false), REPLY_WAIT_MS);
      channel.onmessage = (event): void => {
        if (event.data?.type === 'in-use' && event.data.id === id) {
          window.clearTimeout(timer);
          resolve(true);
        }
      };
      channel.postMessage({ type: 'in-use?', id });
    });
  } finally {
    channel.close();
  }
}

// Whether this document could be a copy of another tab at all. Reloading, and
// coming back through history, are by definition the same tab continuing — the
// inherited id is ours and there is nothing to ask. Only a fresh navigation can
// be Duplicate Tab, window.open or a link, which are the ways sessionStorage
// gets copied.
//
// Asking anyway was not merely wasteful: it is the question the outgoing
// document could answer, and a reload that believes itself a duplicate loses
// its record. Not asking removes the race rather than narrowing it.
function couldBeACopy(): boolean {
  const [entry] = performance.getEntriesByType('navigation');
  return !entry || (entry as PerformanceNavigationTiming).type === 'navigate';
}

// This tab's id, settled once per page load. An inherited id is kept unless
// this is a fresh navigation *and* a live tab answers to it, which together
// mean we were copied — so an ordinary reload keeps its id, and its record.
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
  const copied = inherited !== null && couldBeACopy() && (await isIdLive(inherited));
  const id = inherited && !copied ? inherited : newId();
  if (id !== inherited) {
    try {
      window.sessionStorage.setItem(TAB_KEY, id);
    } catch {
      // see above
    }
  }
  claimed = id;
  startResponding(id);
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
