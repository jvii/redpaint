import { FontListSource } from '../../domain/systemFonts';

// The text tool's font, and the requester that edits it. Same shape as the
// fillStyle module: a few settings plus the open flag and a snapshot so Cancel
// can put back what the panel was opened with.

// Sizes the requester offers, as DPaint's Font menu offered a fixed list
// ("8 POINT, 10 POINT ... 16 POINT") rather than a free number. Extended
// upward, since nothing here is limited to what fitted in an Amiga font
// drawer. 8 and 10 are included and expected to look poor: outlines that small
// have sub-pixel stems and no hinting survives the rasterizer, and the preview
// is where that becomes visible rather than a surprise on the canvas.
export const FONT_SIZES = [8, 10, 12, 14, 16, 20, 24, 32, 48, 64];

// The sizes offered for a face drawn on a pixel grid: the ones above that are
// whole multiples of it. Between them the glyphs fall off their own grid and
// the face stops being crisp, which is the only reason it is bundled.
export function sizesForGrid(gridSize: number): number[] {
  return FONT_SIZES.filter((size): boolean => size % gridSize === 0);
}

// The nearest offered size, for when the face changes under a size it does not
// have. Snapping keeps state and the size control agreeing — an unsnapped size
// would leave every segment unselected and no way to tell what is in force.
export function snapSizeToGrid(size: number, gridSize: number): number {
  return sizesForGrid(gridSize).reduce((best, candidate): number =>
    Math.abs(candidate - size) < Math.abs(best - size) ? candidate : best
  );
}

export const DEFAULT_FAMILY = 'Arial';
export const DEFAULT_SIZE = 16;

type Snapshot = {
  faceId: string | null;
  scale: number;
  family: string;
  size: number;
  bold: boolean;
  italic: boolean;
};

// Whole-number scales a bundled bitmap face is offered at. A bitmap font has
// exactly one size, and anything between these is a resample — which is how a
// pixel face stops being one.
export const BITMAP_SCALES = [1, 2, 3, 4];

export type State = {
  // Which kind of face the tool paints with. A bundled bitmap face is the only
  // way to have text below about 12px at all (see BitmapFont.ts); an outline
  // face is everything the machine has installed.
  faceId: string | null; // a BUNDLED_FACES id, or null for the system family
  scale: number; // bitmap faces only
  family: string;
  size: number;
  bold: boolean;
  italic: boolean;
  settingsOpen: boolean;
  settingsSnapshot: Snapshot | null;
  // Filled on first open, not at startup: enumeration prompts for permission
  // where it exists, and asking before anyone has opened the requester would
  // be a prompt with no visible cause.
  families: string[];
  // Whether `families` is the machine's real font list or a probe of guessed
  // names (see domain/systemFonts.ts). The requester says which.
  familiesSource: FontListSource;
  familiesLoaded: boolean;
};

export const state: State = {
  faceId: null,
  scale: 1,
  family: DEFAULT_FAMILY,
  size: DEFAULT_SIZE,
  bold: false,
  italic: false,
  settingsOpen: false,
  settingsSnapshot: null,
  families: [],
  familiesSource: 'probed',
  familiesLoaded: false,
};
