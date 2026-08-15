import { Color } from '../types';
import { CycleRange } from '../algorithm/paletteRange';
import { idbDelete, idbGet, idbKeys, idbSet } from './idb';
import { ensureTabId, tabId } from './tabIdentity';

// One record per tab, not one for the origin. See tabIdentity.ts for why, and
// for how a tab keeps the same id across a reload.
const KEY_PREFIX = 'doc:';

function ownKey(): string {
  return KEY_PREFIX + tabId();
}

// A restore that killed the tab must not be retried. Goes down before a record
// is applied and comes up once it is, so finding our own marker at startup
// means the last attempt died and that record is dropped. One per tab, holding
// the record key (docs/gotchas.md, "Autosave").
const GUARD_PREFIX = 'guard:';

// The page that is not on screen, kept beside the document rather than inside
// it. One record per tab, like the document's.
//
// Its own key because of how differently the two change: the document record is
// rewritten every time the painting pauses, and folding a second raster into it
// would double every one of those writes for a page that only changes on a
// swap, a copy or a delete. A swap rewrites both, once, as the two pages trade
// places.
const OFF_PAGE_PREFIX = 'offpage:';

function ownOffPageKey(): string {
  return OFF_PAGE_PREFIX + tabId();
}

// What an off-screen page needs to come back: its raster and the state that
// belongs to the page rather than to the document. No history — session state,
// and megabytes an entry (docs/local/spare-page.md).
export type OffPageRecord = {
  version: number;
  width: number;
  height: number;
  pixels: Uint8Array;
  packed: boolean;
  // Per page by decree of the DPaint II manual, so it cannot ride on the
  // document record.
  backgroundColorId: string;
  savedAt: number;
};

export async function saveOffPage(record: Omit<OffPageRecord, 'savedAt'>): Promise<boolean> {
  return idbSet(ownOffPageKey(), { ...record, savedAt: Date.now() });
}

// Called when the document goes back to a single page: a record nothing will
// claim is a record that only takes up quota.
export async function clearOffPage(): Promise<void> {
  await idbDelete(ownOffPageKey());
}

// Read as part of the same guarded attempt as the document, so a poisoned one
// is dropped with it rather than surviving to break the next start too.
export async function loadOffPage(): Promise<OffPageRecord | null> {
  const record = await idbGet<OffPageRecord>(ownOffPageKey());
  if (!record || record.version !== VERSION || !isUsableRaster(record)) {
    if (record) {
      await clearOffPage();
    }
    return null;
  }
  return record;
}

function ownGuardKey(): string {
  return GUARD_PREFIX + tabId();
}

// How many records to keep. Enough for a few tabs at once without letting a
// browsing history of closed tabs accumulate: these run to tens of megabytes
// each on a large canvas, and the origin's quota is not ours alone.
const MAX_RECORDS = 4;
// And nothing older than this, however few there are. A week-old backup of a
// picture you have not opened since is not what anyone means by "where I left
// off".
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Bumped when the shape below changes. Older records are discarded, not
// migrated.
const VERSION = 1;

// What comes back after a reload. No undo history: session state, and megabytes
// an entry (docs/local/undo-memory.md, part 4 "Scope").
export type DocumentRecord = {
  version: number;
  width: number;
  height: number;
  // One byte per pixel when fully indexed, four when not; `packed` says which,
  // since a picture can gain true-colour pixels mid-session.
  pixels: Uint8Array;
  packed: boolean;
  palette: Color[];
  ranges: (CycleRange | null)[];
  // Travels with the picture: the raster is the wrong shape at another aspect.
  screenFormatId: string | null;
  videoStandard: string;
  trueColorEnabled: boolean;
  documentName: string;
  // Restoring is not saving, so one that came back unsaved must still say so.
  modified: boolean;
  // Which page this raster was, so the readout names the same page after a
  // reload as before it. Absent on records written before pages existed, which
  // read as page one. Not version-bumping for it: an older build ignores the
  // field, and a bump would throw away every backup in existence to add a
  // number nobody's picture depends on.
  currentPageIndex?: number;
  // When it was written; decides pruning. Absent on pre-per-tab records, which
  // therefore sort as oldest.
  savedAt: number;
};

// savedAt is stamped here: a record without one sorts as ancient, and is pruned
// first.
export async function saveDocument(record: Omit<DocumentRecord, 'savedAt'>): Promise<boolean> {
  return idbSet(ownKey(), { ...record, savedAt: Date.now() });
}

export async function clearDocument(): Promise<void> {
  await idbDelete(ownKey());
}

// Pre-per-tab key. Nothing reads it; deleted so it stops taking up quota.
const LEGACY_KEY = 'document';

// Dev-only, from the console as __redpaint.autosaveState(); nothing calls it.
export async function autosaveState(): Promise<unknown> {
  const keys = await idbKeys();
  const records = await Promise.all(
    keys
      .filter((key) => key.startsWith(KEY_PREFIX))
      .map(async (key) => {
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
    offPages: keys
      .filter((key) => key.startsWith(OFF_PAGE_PREFIX))
      .map((key) => ({ key, mine: key === ownOffPageKey() })),
    // Set only while a restore is in flight, or left behind by one that died.
    interruptedMarker: await idbGet<string>(ownGuardKey()),
    otherTabsRestoring: keys.filter((key) => key.startsWith(GUARD_PREFIX) && key !== ownGuardKey()),
  };
}

// Drops records past their week or beyond the newest few; never this tab's own.
// At startup, not per write: reading savedAt deserialises the whole raster
// (docs/gotchas.md, "Autosave").
async function prune(): Promise<void> {
  await idbDelete(LEGACY_KEY);
  const mine = ownKey();
  const keys = await idbKeys();
  // Records only: a marker has no savedAt, so it would date as ancient and be
  // swept, including the live one (docs/gotchas.md).
  const records = keys.filter((key) => key.startsWith(KEY_PREFIX) && key !== mine);
  const dated = await Promise.all(
    records.map(async (key) => ({ key, at: (await idbGet<DocumentRecord>(key))?.savedAt ?? 0 }))
  );
  const now = Date.now();
  const survivors = dated
    .filter((entry) => now - entry.at <= MAX_AGE_MS)
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_RECORDS - 1)
    .map((entry) => entry.key);
  // A marker goes when the record sharing its id goes, as does one that never
  // had a record. Never this tab's own. The off-screen page goes with its
  // document for the same reason and is the larger of the two: a page nobody
  // can reach is the whole of what pruning is for.
  const kept = new Set([mine, ...survivors].map((key) => key.slice(KEY_PREFIX.length)));
  const orphaned = (prefix: string, own: string): string[] =>
    keys.filter(
      (key) => key.startsWith(prefix) && key !== own && !kept.has(key.slice(prefix.length))
    );
  const doomed = dated.filter((entry) => !survivors.includes(entry.key)).map((entry) => entry.key);
  await Promise.all(
    [
      ...doomed,
      ...orphaned(GUARD_PREFIX, ownGuardKey()),
      ...orphaned(OFF_PAGE_PREFIX, ownOffPageKey()),
    ].map((key) => idbDelete(key))
  );
}

// The half of the check both records share: a raster whose bytes match the size
// it claims. A truncated write otherwise paints garbage.
function isUsableRaster(record: {
  width: number;
  height: number;
  pixels: Uint8Array;
  packed: boolean;
}): boolean {
  const { width, height, pixels } = record;
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0 &&
    pixels instanceof Uint8Array &&
    pixels.length === width * height * (record.packed ? 1 : 4)
  );
}

// Untrusted input: an older build, or a half-written record.
function isUsable(record: DocumentRecord | null): record is DocumentRecord {
  if (!record || record.version !== VERSION) {
    return false;
  }
  return isUsableRaster(record) && Array.isArray(record.palette) && record.palette.length > 0;
}

// The saved document, or null if there is nothing to restore, it cannot be
// trusted, or the last attempt died: all three leave a blank canvas.
export async function loadDocument(): Promise<DocumentRecord | null> {
  await ensureTabId();
  // Not awaited: a restore should not wait on housekeeping.
  void prune();
  // Our own marker, so finding it set has one meaning: our last attempt died.
  const interrupted = await idbGet<string>(ownGuardKey());
  if (interrupted) {
    // the previous attempt never finished: assume the record it was applying is
    // what stopped it, and let that one go rather than reopening the same trap
    await idbDelete(ownGuardKey());
    await idbDelete(interrupted);
    return null;
  }
  const own = await idbGet<DocumentRecord>(ownKey());
  if (isUsable(own)) {
    // awaited, so the marker has committed before a single pixel is applied
    await idbSet(ownGuardKey(), ownKey());
    return own;
  }
  if (own) {
    await clearDocument(); // ours, and unusable
  }
  // A tab gets its own picture back and no one else's, however many records are
  // in storage; reaching another tab's is a deliberate act for a Restore
  // requester (docs/gotchas.md, "Autosave").
  return null;
}

// Called once the record has been applied without incident.
export async function finishRestore(): Promise<void> {
  await idbDelete(ownGuardKey());
}
