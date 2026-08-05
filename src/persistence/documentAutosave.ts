import { Color } from '../types';
import { CycleRange } from '../algorithm/paletteRange';
import { idbDelete, idbGet, idbKeys, idbSet } from './idb';

// One record per tab, not one for the origin. Two tabs share IndexedDB, so a
// single key meant whichever painted last owned the backup and the other tab's
// was gone — and a reloaded tab got back whatever its neighbour had been doing
// rather than its own picture.
//
// The id lives in sessionStorage, which is the piece that makes this work: it
// is unique per tab, it survives a reload of that tab, and it goes away when
// the tab does. So a reload finds its own record, and a genuinely new tab finds
// none and adopts instead (see loadDocument).
const KEY_PREFIX = 'doc:';
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

// This tab's id, settled once per page load. An inherited id is kept unless a
// live tab answers to it, which is the only case that means we were copied —
// so an ordinary reload keeps its id, and its record.
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
  const id = inherited && !(await isIdLive(inherited)) ? inherited : newId();
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

// Settled by ensureTabId, which loadDocument awaits before anything else runs.
// The fallback is only reachable if a save somehow beat the restore; it uses the
// inherited id, which is the same answer in every case but a duplicated tab.
function ownKey(): string {
  if (claimed) {
    return KEY_PREFIX + claimed;
  }
  try {
    return KEY_PREFIX + (window.sessionStorage.getItem(TAB_KEY) ?? 'unclaimed');
  } catch {
    return KEY_PREFIX + 'unclaimed';
  }
}

// How many records to keep. Enough for a few tabs at once without letting a
// browsing history of closed tabs accumulate: these run to tens of megabytes
// each on a large canvas, and the origin's quota is not ours alone.
const MAX_RECORDS = 4;
// And nothing older than this, however few there are. A week-old backup of a
// picture you have not opened since is not what anyone means by "where I left
// off".
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Bumped whenever the shape below changes in a way an older record cannot
// satisfy. A record from another version is discarded rather than migrated:
// this is a convenience copy of something the user can also save to a file, so
// the cost of throwing one away is a session, not a picture.
const VERSION = 1;

// What comes back after a reload. Everything the picture needs to be itself,
// and nothing that is merely how the app was left — no selected tool, no
// symmetry, no menu state (docs/local/undo-memory.md, part 4 "Scope").
//
// The undo history is deliberately absent. It is session state: an invisible
// stack whose value decays the moment you stop remembering what you did, and
// it costs megabytes an entry. What is restored is the picture, not the way you
// arrived at it.
export type DocumentRecord = {
  version: number;
  width: number;
  height: number;
  // The raster. One byte per pixel when the picture is fully indexed, which is
  // nearly always: the texture keeps 4 bytes each because it is an RGBA
  // texture, but only R carries anything unless there are true-colour pixels,
  // and then the other three are a constant. A quarter of the bytes to write,
  // every write, for a canvas that is written every second or two.
  //
  // `packed` says which form this is, because a picture can gain true-colour
  // pixels mid-session and the record must be read back as it was written.
  pixels: Uint8Array;
  packed: boolean;
  palette: Color[];
  ranges: (CycleRange | null)[];
  // The screen being simulated travels with the picture: the raster is
  // meaningless at the wrong aspect, and restoring 320x256 pixels into a Native
  // canvas would show them at the wrong shape.
  screenFormatId: string | null;
  videoStandard: string;
  trueColorEnabled: boolean;
  documentName: string;
  // Whether the picture had changes no file carried, at the moment it was
  // written. Restoring is not saving — the record is browser storage, which a
  // cleared site or another machine does not have — so a picture that came back
  // unsaved must still say so.
  modified: boolean;
  // When it was written, which is what decides adoption (the newest orphan) and
  // pruning (the oldest go). Absent on records from before per-tab keys, which
  // sort as oldest and so are adopted only when nothing newer exists.
  savedAt: number;
};

// A restore that crashed the tab must not be retried forever. The marker goes
// down before the record is touched and comes up once it is safely applied, so
// a start that finds it already set knows the last attempt did not survive —
// and drops the record instead of trying again.
//
// localStorage rather than IndexedDB for this one: it has to have landed before
// the thing that might crash begins, and only a synchronous write guarantees
// that. A single value, so none of the size objections apply.
//
// It holds a time, not a flag, because localStorage is shared by every tab on
// the origin. A marker seconds old means another tab is restoring right now —
// which is nothing like "we died last time", and treating it as such let a
// second tab delete the saved picture out from under the first. Only a marker
// older than any restore could possibly take means the attempt really did stop.
const GUARD_KEY = 'redpaint.restoring';

// A restore is a read and an upload: milliseconds. Anything still marked after
// this was not slow, it was interrupted.
const GUARD_STALE_MS = 15000;

// Records which record was being applied, not just when. With one key per tab
// the two can differ — a tab may be applying a record it adopted from another —
// and dropping "ours" on the next start would leave the one that actually
// stopped us sitting there for the next tab to adopt.
function guardSet(recordKey: string): void {
  try {
    window.localStorage.setItem(GUARD_KEY, `${Date.now()}:${recordKey}`);
  } catch {
    // blocked site data throws rather than returning null; the guard simply
    // does not operate, which is no worse than not having it
  }
}

function guardClear(): void {
  try {
    window.localStorage.removeItem(GUARD_KEY);
  } catch {
    // see above
  }
}

// True only for a marker old enough to mean an interrupted attempt rather than
// a concurrent one. An unparseable value counts as stale: it is not ours, and
// leaving it to block restores forever would be worse than one wasted retry.
// The record an interrupted attempt was applying, or null when there is nothing
// to do — no marker, or one recent enough to belong to another tab restoring
// right now. A marker with no key (an older build's, or nonsense) is taken to
// mean this tab's own record: it is the only guess available, and leaving a
// marker to block every restore forever would be worse than one wasted retry.
function interruptedRecordKey(): string | null {
  try {
    const marked = window.localStorage.getItem(GUARD_KEY);
    if (marked === null) {
      return null;
    }
    const separator = marked.indexOf(':');
    const at = Number(separator === -1 ? marked : marked.slice(0, separator));
    if (Number.isFinite(at) && Date.now() - at <= GUARD_STALE_MS) {
      return null;
    }
    return (separator === -1 ? '' : marked.slice(separator + 1)) || ownKey();
  } catch {
    return null;
  }
}

// savedAt is stamped here rather than passed in: the caller has no business
// deciding when its own write happened, and a record without one sorts as
// ancient, which would quietly make it unadoptable and first to be pruned.
export async function saveDocument(record: Omit<DocumentRecord, 'savedAt'>): Promise<boolean> {
  const written = await idbSet(ownKey(), { ...record, savedAt: Date.now() });
  if (written) {
    await prune();
  }
  return written;
}

export async function clearDocument(): Promise<void> {
  await idbDelete(ownKey());
}

// The single key everything shared before records were per tab. Nothing looks
// for it any more, so it would sit there forever taking up quota; a build that
// old is also the one whose records this build cannot vouch for.
const LEGACY_KEY = 'document';

// What is actually in storage, for working out why a restore did or did not
// happen. Dev-only convenience, reached from the console as
// __redpaint.autosaveState() — nothing in the app calls it.
export async function autosaveState(): Promise<unknown> {
  const keys = await idbKeys();
  const records = await Promise.all(
    keys.map(async (key) => {
      const record = await idbGet<DocumentRecord>(key);
      return {
        key,
        mine: key === ownKey(),
        size: record ? `${record.width}x${record.height}` : null,
        bytes: record?.pixels?.length ?? null,
        usable: isUsable(record ?? null),
        savedAt: record?.savedAt ? new Date(record.savedAt).toISOString() : null,
      };
    })
  );
  return {
    thisTab: ownKey(),
    records,
    interruptedMarker: window.localStorage.getItem(GUARD_KEY),
  };
}

// Drops the records nobody is coming back for: anything past its week, and
// anything beyond the newest few. This tab's own is never a candidate, however
// long it has been idle — it is the one record we know has an owner.
async function prune(): Promise<void> {
  await idbDelete(LEGACY_KEY);
  const mine = ownKey();
  const keys = (await idbKeys()).filter((key) => key !== mine);
  const dated = await Promise.all(
    keys.map(async (key) => ({ key, at: (await idbGet<DocumentRecord>(key))?.savedAt ?? 0 }))
  );
  const now = Date.now();
  const survivors = dated
    .filter((entry) => now - entry.at <= MAX_AGE_MS)
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_RECORDS - 1)
    .map((entry) => entry.key);
  await Promise.all(
    dated.filter((entry) => !survivors.includes(entry.key)).map((entry) => idbDelete(entry.key))
  );
}

// Anything read back is untrusted input from an older build or a half-written
// record, so every field is checked before a single pixel of it is believed.
function isUsable(record: DocumentRecord | null): record is DocumentRecord {
  if (!record || record.version !== VERSION) {
    return false;
  }
  const { width, height, pixels, palette } = record;
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0 &&
    pixels instanceof Uint8Array &&
    // the one check that catches a truncated write, which is otherwise a
    // plausible-looking record that paints garbage — against whichever form
    // the record says it is in
    pixels.length === width * height * (record.packed ? 1 : 4) &&
    Array.isArray(palette) &&
    palette.length > 0
  );
}

// The saved document, or null if there is nothing to restore, it cannot be
// trusted, or the last attempt to apply it did not survive. Any of those three
// leaves the app on a blank canvas, which is the state it would have had
// anyway — a restore is a convenience, and failing it silently is the right
// kind of failure.
export async function loadDocument(): Promise<DocumentRecord | null> {
  await ensureTabId();
  const interrupted = interruptedRecordKey();
  if (interrupted !== null) {
    // the previous attempt never finished: assume the record it was applying is
    // what stopped it, and let that one go rather than reopening the same trap
    // — for this tab, and for the next one that would have adopted it
    guardClear();
    await idbDelete(interrupted);
    return null;
  }
  const own = await idbGet<DocumentRecord>(ownKey());
  if (isUsable(own)) {
    guardSet(ownKey());
    return own;
  }
  if (own) {
    await clearDocument(); // ours, and unusable
  }
  // Nothing of our own, so nothing to restore. A tab gets its own picture back
  // and no one else's: a new tab opens on a blank canvas, however many records
  // are sitting in storage.
  //
  // It used to adopt the most recent one, which read as the tabs being synced —
  // open a second tab and it showed the first tab's picture; clear one and the
  // other came back empty. Reaching a backup that is not this tab's own is a
  // deliberate act, and belongs to a Restore requester you ask for rather than
  // to something that happens by itself at startup.
  return null;
}

// Called once the record has been applied without incident.
export function finishRestore(): void {
  guardClear();
}
