import { Color } from '../types';
import { CycleRange } from '../algorithm/paletteRange';
import { idbDelete, idbGet, idbSet } from './idb';

const KEY = 'document';

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
};

// A restore that crashed the tab must not be retried forever. The marker goes
// down before the record is touched and comes up once it is safely applied, so
// a start that finds it already set knows the last attempt did not survive —
// and drops the record instead of trying again.
//
// localStorage rather than IndexedDB for this one: it has to have landed before
// the thing that might crash begins, and only a synchronous write guarantees
// that. A single flag, so none of the size objections apply.
const GUARD_KEY = 'redpaint.restoring';

function guardSet(): void {
  try {
    window.localStorage.setItem(GUARD_KEY, '1');
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

function guardIsSet(): boolean {
  try {
    return window.localStorage.getItem(GUARD_KEY) !== null;
  } catch {
    return false;
  }
}

export async function saveDocument(record: DocumentRecord): Promise<boolean> {
  return idbSet(KEY, record);
}

export async function clearDocument(): Promise<void> {
  await idbDelete(KEY);
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
  if (guardIsSet()) {
    // the previous attempt never finished: assume this record is what stopped
    // it, and let it go rather than reopening the same trap every launch
    guardClear();
    await clearDocument();
    return null;
  }
  const record = await idbGet<DocumentRecord>(KEY);
  if (!isUsable(record)) {
    if (record) {
      await clearDocument();
    }
    return null;
  }
  guardSet();
  return record;
}

// Called once the record has been applied without incident.
export function finishRestore(): void {
  guardClear();
}
