import { Color } from '../types';
import { CycleRange } from '../algorithm/paletteRange';
import { idbDelete, idbGet, idbKeys, idbSet } from './idb';
import { ensureTabId, tabId } from './tabIdentity';

// One record per tab, not one for the origin — see tabIdentity.ts for why, and
// for how a tab keeps the same id across a reload.
const KEY_PREFIX = 'doc:';

function ownKey(): string {
  return KEY_PREFIX + tabId();
}

// A restore that killed the tab must not be retried. The marker goes down
// before the record is applied and comes up once it is, so finding our own
// marker at startup means the last attempt died — and that record is dropped
// rather than reopened. One per tab, keyed like the record, so finding it set
// has exactly one meaning (docs/gotchas.md, "Autosave"). It holds the record
// key rather than a flag, for a requester that applies another tab's record.
const GUARD_PREFIX = 'guard:';

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

// Bumped when the shape below changes. Older records are discarded rather than
// migrated — this is a convenience copy, so the cost is a session, not a
// picture.
const VERSION = 1;

// What comes back after a reload: everything the picture needs to be itself,
// and nothing that is merely how the app was left. No undo history — session
// state, and megabytes an entry (docs/local/undo-memory.md, part 4 "Scope").
export type DocumentRecord = {
  version: number;
  width: number;
  height: number;
  // The raster, one byte per pixel when the picture is fully indexed (only R
  // carries anything then) and four when it is not. `packed` says which, since
  // a picture can gain true-colour pixels mid-session.
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
  // Whether the picture had changes no file carried. Restoring is not saving,
  // so one that came back unsaved must still say so.
  modified: boolean;
  // When it was written; decides pruning. Absent on pre-per-tab records, which
  // therefore sort as oldest.
  savedAt: number;
};

// savedAt is stamped here, not passed in: a record without one sorts as ancient
// and would be pruned first.
export async function saveDocument(record: Omit<DocumentRecord, 'savedAt'>): Promise<boolean> {
  return idbSet(ownKey(), { ...record, savedAt: Date.now() });
}

export async function clearDocument(): Promise<void> {
  await idbDelete(ownKey());
}

// The single key used before records were per tab. Nothing reads it now, so it
// would sit there taking up quota.
const LEGACY_KEY = 'document';

// What is actually in storage, for working out why a restore did or did not
// happen. Dev-only convenience, reached from the console as
// __redpaint.autosaveState() — nothing in the app calls it.
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
    // Set only while a restore is in flight, or left behind by one that died.
    interruptedMarker: await idbGet<string>(ownGuardKey()),
    otherTabsRestoring: keys.filter((key) => key.startsWith(GUARD_PREFIX) && key !== ownGuardKey()),
  };
}

// Drops the records nobody is coming back for: past their week, or beyond the
// newest few. Never this tab's own. At startup rather than after each write —
// reading savedAt deserialises the whole raster (docs/gotchas.md, "Autosave").
async function prune(): Promise<void> {
  await idbDelete(LEGACY_KEY);
  const mine = ownKey();
  const keys = await idbKeys();
  // Records only: a marker has no savedAt, so treating one as a record dates it
  // as ancient and sweeps it — including the live one (docs/gotchas.md).
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
  // had a record. Never this tab's own.
  const kept = new Set([mine, ...survivors].map((key) => key.slice(KEY_PREFIX.length)));
  const staleGuards = keys.filter(
    (key) =>
      key.startsWith(GUARD_PREFIX) &&
      key !== ownGuardKey() &&
      !kept.has(key.slice(GUARD_PREFIX.length))
  );
  const doomed = dated.filter((entry) => !survivors.includes(entry.key)).map((entry) => entry.key);
  await Promise.all([...doomed, ...staleGuards].map((key) => idbDelete(key)));
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
    // catches a truncated write, which otherwise paints garbage
    pixels.length === width * height * (record.packed ? 1 : 4) &&
    Array.isArray(palette) &&
    palette.length > 0
  );
}

// The saved document, or null if there is nothing to restore, it cannot be
// trusted, or the last attempt died. All three leave a blank canvas, which is
// what the app would have had anyway.
export async function loadDocument(): Promise<DocumentRecord | null> {
  await ensureTabId();
  // Not awaited: nothing here depends on it having finished, and a restore
  // should not wait on housekeeping for records it will not read.
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
