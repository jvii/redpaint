import { Color } from '../types';
import { CycleRange } from '../algorithm/paletteRange';
import { idbDelete, idbGet, idbKeys, idbSet } from './idb';
import { ensureTabId, tabId } from './tabIdentity';
import {
  interruptedRecordKey,
  markRestoreFinished,
  markRestoreStarted,
  restoreMarker,
} from './restoreGuard';

// One record per tab, not one for the origin — see tabIdentity.ts for why, and
// for how a tab keeps the same id across a reload.
const KEY_PREFIX = 'doc:';

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
  // When it was written, which is what decides pruning (the oldest go). Absent
  // on records from before per-tab keys, which sort as oldest and so are the
  // first to go.
  savedAt: number;
};

// savedAt is stamped here rather than passed in: the caller has no business
// deciding when its own write happened, and a record without one sorts as
// ancient, which would quietly make it first to be pruned.
export async function saveDocument(record: Omit<DocumentRecord, 'savedAt'>): Promise<boolean> {
  return idbSet(ownKey(), { ...record, savedAt: Date.now() });
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
    interruptedMarker: restoreMarker(),
  };
}

// Drops the records nobody is coming back for: anything past its week, and
// anything beyond the newest few. This tab's own is never a candidate, however
// long it has been idle — it is the one record we know has an owner.
//
// Called once at startup, not after each write. Reading `savedAt` means reading
// the whole record, raster included, so pruning on the write path deserialised
// every neighbouring record — tens of megabytes — on every autosave, and threw
// the lot away. Records only accumulate when tabs come and go, never when one
// tab saves repeatedly, so a startup is exactly as often as this needs to run.
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
  // Not awaited: nothing here depends on it having finished, and a restore
  // should not wait on housekeeping for records it will not read.
  void prune();
  const interrupted = interruptedRecordKey(ownKey());
  if (interrupted !== null) {
    // the previous attempt never finished: assume the record it was applying is
    // what stopped it, and let that one go rather than reopening the same trap
    // — for this tab, and for the next one that would have adopted it
    markRestoreFinished();
    await idbDelete(interrupted);
    return null;
  }
  const own = await idbGet<DocumentRecord>(ownKey());
  if (isUsable(own)) {
    markRestoreStarted(ownKey());
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
  markRestoreFinished();
}
