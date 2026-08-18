import { FontListSource } from '../../domain/systemFonts';

// The text tool's font, and the requester that edits it. Same shape as the
// fillStyle module: a few settings plus the open flag and a snapshot so Cancel
// can put back what the panel was opened with.

// The size is set by a slider with no figure on it, because the figure was
// never the thing being chosen: a px size is an em, not a height, so the same
// number gives visibly different text in different faces, and reading "24" told
// you nothing the preview does not show better. The preview draws at true
// canvas scale (useFontPreview), so it *is* the readout.

export const SIZE_MAX = 128;

// Below about 20px an outline face has no whole pixels to put its stems on and
// breaks up under thresholding (glyphRaster.ts). Offering smaller sizes only
// offered a result nobody would keep — the bundled pixel faces are the answer
// down there, and they have their own floor below.
export const SYSTEM_SIZE_MIN = 20;

export type SizeRange = { min: number; max: number; step: number };

// A face drawn on a pixel grid is crisp only at whole multiples of it, so its
// slider steps by that grid and starts at it. An installed family has no grid
// to respect and moves a pixel at a time, no lower than SYSTEM_SIZE_MIN.
export function sizeRangeFor(gridSize: number | undefined): SizeRange {
  return gridSize
    ? { min: gridSize, max: SIZE_MAX, step: gridSize }
    : { min: SYSTEM_SIZE_MIN, max: SIZE_MAX, step: 1 };
}

// Brings a size into a range, for when the face changes under it: a bundled
// face's grid and a system face's floor do not overlap, so a size carried
// across is often not one the new face offers.
export function constrainSize(size: number, range: SizeRange): number {
  const stepped = Math.round((size - range.min) / range.step) * range.step + range.min;
  return Math.max(range.min, Math.min(range.max, stepped));
}

// A bundled face, so a fresh session paints something crisp without anyone
// having opened the requester — and it is already served for the UI
// (index.html), so it renders from the first keystroke without waiting on
// loadBundledFaces.
export const DEFAULT_FAMILY = 'Press Start 2P';
// A multiple of 8 as well as being above SYSTEM_SIZE_MIN, so it survives a
// switch to either kind of face untouched.
export const DEFAULT_SIZE = 24;

type Snapshot = {
  family: string;
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  // Not a font setting, but the requester edits it (the Filled/Unfilled toggle
  // picks the same tool the gadget's two halves do), so Cancel has to put it
  // back with the rest.
  filled: boolean;
};

export type State = {
  family: string;
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  settingsOpen: boolean;
  settingsSnapshot: Snapshot | null;
  // Filled on first open, not at startup: enumeration prompts for permission
  // where it exists, and asking before anyone has opened the requester would
  // be a prompt with no visible cause.
  families: string[];
  // Whether `families` is the machine's real font list or a probe of guessed
  // names (see domain/systemFonts.ts). The requester says so when it is a
  // probe, since a guessed list cannot be read as everything installed.
  familiesSource: FontListSource;
  familiesLoaded: boolean;
};

export const state: State = {
  family: DEFAULT_FAMILY,
  size: DEFAULT_SIZE,
  bold: false,
  italic: false,
  underline: false,
  settingsOpen: false,
  settingsSnapshot: null,
  families: [],
  familiesSource: 'probed',
  familiesLoaded: false,
};
