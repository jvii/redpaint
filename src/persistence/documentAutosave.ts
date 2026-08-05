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

// Which ids are in use, and when each was last heard from. Needed because
// sessionStorage is not quite as private as it looks: duplicating a tab, or
// opening one through a link or window.open, *copies* it — so the new tab
// arrives holding an id another tab is already painting under, and the two
// would share one record and clobber each other, which is the whole thing per-
// tab keys exist to prevent.
const TABS_KEY = 'redpaint.tabs';
// How often a tab says it is still here, and how long silence means it is gone.
// Generous, because the cost of guessing wrong is small (see claimTabId).
const HEARTBEAT_MS = 4000;
const TAB_SILENT_MS = 15000;

function readTabs(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(TABS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeTabs(tabs: Record<string, number>): void {
  try {
    window.localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
  } catch {
    // storage blocked; duplicate detection simply does not operate
  }
}

function newId(): string {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(36).slice(2);
}

let claimed: string | null = null;

// This tab's id, minting a fresh one if the id we were handed is already being
// used by a tab that is still talking — which means we were copied from it.
//
// A reload of our own tab is not that: releaseTabId drops the claim on the way
// out, so the id is free when we come back and we keep it, along with our own
// record. An unclean exit can leave a claim standing, and then a quick reopen
// looks like a duplicate and mints a new id — costing that tab its own record
// and sending it to adoption instead, which restores the same picture anyway.
// A mild wrong answer in a rare case, which is why the silence window is long
// rather than tight.
function tabId(): string {
  if (claimed) {
    return claimed;
  }
  try {
    const tabs = readTabs();
    const now = Date.now();
    const inherited = window.sessionStorage.getItem(TAB_KEY);
    const takenByAnother = inherited && tabs[inherited] && now - tabs[inherited] < TAB_SILENT_MS;
    const id = !inherited || takenByAnother ? newId() : inherited;
    if (id !== inherited) {
      window.sessionStorage.setItem(TAB_KEY, id);
    }
    // drop tabs that have gone quiet while we are in here anyway
    const live: Record<string, number> = { [id]: now };
    for (const [other, at] of Object.entries(tabs)) {
      if (other !== id && now - at < TAB_SILENT_MS) {
        live[other] = at;
      }
    }
    writeTabs(live);
    claimed = id;
    return id;
  } catch {
    // storage blocked: this tab cannot keep an identity across reloads, so it
    // behaves like a new one each time — it still saves and still adopts
    claimed = 'volatile';
    return claimed;
  }
}

// Says this tab is still here, so a tab copied from it knows to mint its own
// id. Returns the stop function.
export function startTabHeartbeat(): () => void {
  const id = tabId();
  const beat = (): void => {
    const tabs = readTabs();
    tabs[id] = Date.now();
    writeTabs(tabs);
  };
  beat();
  const timer = window.setInterval(beat, HEARTBEAT_MS);
  const release = (): void => {
    const tabs = readTabs();
    delete tabs[id];
    writeTabs(tabs);
  };
  // Released on the way out so our own reload finds the id free and keeps it.
  window.addEventListener('pagehide', release);
  return (): void => {
    window.clearInterval(timer);
    window.removeEventListener('pagehide', release);
    release();
  };
}

function ownKey(): string {
  return KEY_PREFIX + tabId();
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
  // The colour-index raster verbatim, 4 bytes per pixel, exactly as
  // CanvasColorIndex holds it.
  pixels: Uint8Array;
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

// Drops the records nobody is coming back for: anything past its week, and
// anything beyond the newest few. This tab's own is never a candidate, however
// long it has been idle — it is the one record we know has an owner.
async function prune(): Promise<void> {
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
    // plausible-looking record that paints garbage
    pixels.length === width * height * 4 &&
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
  // No record of our own: this is a new tab rather than a reloaded one, so it
  // takes over where the most recent one left off — which is what a single-key
  // autosave did for every tab, and what someone reopening the app expects.
  //
  // Adopted by copy, not by claim: the record is left where it is, because a
  // tab whose id we do not recognise may still be open and painting into it.
  // Ours is written under our own id at the next stroke, and prune() clears the
  // duplicate once it is no longer among the newest.
  const adopted = await newestUsableRecord();
  if (!adopted) {
    return null;
  }
  guardSet(adopted.key);
  return adopted.record;
}

type StoredRecord = { key: string; record: DocumentRecord };

async function newestUsableRecord(): Promise<StoredRecord | null> {
  const entries = await Promise.all(
    (await idbKeys()).map(async (key) => ({ key, record: await idbGet<DocumentRecord>(key) }))
  );
  return (
    entries
      .filter((entry): entry is StoredRecord => isUsable(entry.record))
      .sort((a, b) => (b.record.savedAt ?? 0) - (a.record.savedAt ?? 0))[0] ?? null
  );
}

// Called once the record has been applied without incident.
export function finishRestore(): void {
  guardClear();
}
