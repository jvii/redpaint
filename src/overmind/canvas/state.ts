import { derived } from 'overmind';
import { Point } from '../../types';

// The Amiga screen formats of DPaint's Choose Screen Format requester. A real
// Amiga only ever ran one broadcast standard at a time, so DPaint itself
// never showed both sets of numbers together — here the video standard is a
// switch (see VideoStandard/videoStandard below) rather than doubling the
// format list to 8 entries: same 4 named formats, PAL or NTSC picks which
// actual pixel dimensions they mean.
// aspectX/aspectY describe the pixel's display shape relative to a square
// Lo-Res pixel: Med-Res doubles the horizontal resolution on the same
// physical screen (half-wide pixels), Interlace doubles the vertical
// (half-tall), Hi-Res both. This holds within either standard's own frame —
// a format's pixel is always half as wide/tall as that *same standard's*
// Lo-Res pixel — so, unlike width/height, it needs no PAL/NTSC split.
export type ScreenFormatId = 'loRes' | 'medRes' | 'interlace' | 'hiRes';

export type VideoStandard = 'PAL' | 'NTSC';

type ScreenFormatDimensions = { width: number; height: number };

export type ScreenFormat = {
  id: ScreenFormatId;
  name: string;
  aspectX: number;
  aspectY: number;
  dimensions: { [standard in VideoStandard]: ScreenFormatDimensions };
};

export const screenFormats: { [id in ScreenFormatId]: ScreenFormat } = {
  loRes: {
    id: 'loRes',
    name: 'Amiga Lo-Res',
    aspectX: 1,
    aspectY: 1,
    dimensions: { PAL: { width: 320, height: 256 }, NTSC: { width: 320, height: 200 } },
  },
  medRes: {
    id: 'medRes',
    name: 'Amiga Med-Res',
    aspectX: 0.5,
    aspectY: 1,
    dimensions: { PAL: { width: 640, height: 256 }, NTSC: { width: 640, height: 200 } },
  },
  interlace: {
    id: 'interlace',
    name: 'Amiga Interlace',
    aspectX: 1,
    aspectY: 0.5,
    dimensions: { PAL: { width: 320, height: 512 }, NTSC: { width: 320, height: 400 } },
  },
  hiRes: {
    id: 'hiRes',
    name: 'Amiga Hi-Res',
    aspectX: 0.5,
    aspectY: 0.5,
    dimensions: { PAL: { width: 640, height: 512 }, NTSC: { width: 640, height: 400 } },
  },
};

// A format's actual pixel size depends on the active video standard; every
// caller that needs the current width/height goes through this instead of
// reading screenFormats[id] directly.
export function resolveScreenFormat(
  id: ScreenFormatId,
  standard: VideoStandard
): ScreenFormat & ScreenFormatDimensions {
  const format = screenFormats[id];
  return { ...format, ...format.dimensions[standard] };
}

// Finds the standard format (if any) whose exact pixel dimensions match —
// used to auto-select a screen format when an image's own size happens to be
// a standard Amiga one (see beginIlbmLoad). Checks both standards: an
// NTSC-sized image should select NTSC, not silently import as a same-count
// but wrong-standard PAL format.
export function findMatchingScreenFormat(
  width: number,
  height: number
): { id: ScreenFormatId; standard: VideoStandard } | null {
  for (const format of Object.values(screenFormats)) {
    for (const standard of ['PAL', 'NTSC'] as const) {
      const dims = format.dimensions[standard];
      if (dims.width === width && dims.height === height) {
        return { id: format.id, standard };
      }
    }
  }
  return null;
}

// How the simulated screen is scaled to the browser window:
//  - 'stretch': fill the window exactly on both axes with a fractional scale;
//    no margin, but pixels aren't uniform blocks (the cursor's pixel drifts
//    slightly as you move).
//  - 'integer': floor to whole CSS pixels per buffer pixel, so every pixel is
//    a uniform block (crisp, no cursor drift) at the cost of black margin on
//    the right/bottom until the window is enlarged.
export type ScaleMode = 'stretch' | 'integer';

export type State = {
  // the canvas: the actual pixel bitmap being painted (GL drawing buffer size)
  resolution: { width: number; height: number };
  // the simulated screen: null means no simulation — the canvas is shown 1:1
  // in the browser window (the startup behavior). With a format selected,
  // the main canvas is scaled so one screenful of the canvas fills the
  // window, and a canvas larger than the screen scrolls.
  screenFormatId: ScreenFormatId | null;
  // which broadcast standard's pixel dimensions the 4 formats above resolve
  // to (see resolveScreenFormat) — a real Amiga only ran one at a time
  videoStandard: VideoStandard;
  scaleMode: ScaleMode;
  // the active format's pixel display shape ({1,1} when no format): every
  // CSS size derived from the resolution gets multiplied by this so e.g.
  // Med-Res pixels render half as wide as they are tall
  pixelAspect: { x: number; y: number };
  scrollFocusPoint: Point | null;
  zoomFocusPoint: Point | null;
  // Mirror of MainCanvas's own displayScale (CSS px per buffer px, per
  // axis) — that value is computed there from the live canvas div's actual
  // size (window-dependent, see MainCanvas.tsx's own comment) and kept as
  // local component state for its render loop, but other UI that wants to
  // know the canvas's *current* on-screen pixel density — e.g. the Fill
  // Style dialog's live preview, sizing itself to show "an equally sized
  // window into the canvas" — has no other way to see it. Updated every
  // time MainCanvas recomputes its own copy; {1,1} until the canvas has
  // mounted once.
  displayScale: Point;
  // The main drawing pane's size in artwork pixels (its CSS box times the
  // device pixel ratio) — what "fit to window" means at Native, where one
  // artwork pixel is one physical screen pixel and the app already sizes the
  // canvas this way at startup. Mirrored from MainCanvas for the same reason
  // displayScale is: it depends on the live window and the chrome around it,
  // and the Canvas Size requester has no way to measure that pane itself.
  // {0,0} until the canvas has mounted once.
  viewportSize: { width: number; height: number };
  // Whether the committed canvas holds any true-color pixels (hybrid rather
  // than fully indexed). Maintained by the undo actions: every committed
  // content change passes through setUndoPoint, and undo/redo restore the
  // answer memoized on the snapshot they move to — so this stays exact
  // through strokes, loads, clears, undo and redo.
  hasTrueColorPixels: boolean;
  // Whether the document allows true-color pixels (the True Color switch in
  // the Screen Format requester). Switching it off conforms the canvas to the
  // palette; loading an image as True Color switches it back on. Writers that
  // can produce rgb pixels will consult this as they grow (strict indexed
  // mode, per docs/true-color-mode.md).
  trueColorEnabled: boolean;
  // A screen format change that would shrink the canvas (and so lose pixels) is
  // held here *unapplied* while the Resize/Crop/Keep/Cancel question is up —
  // nothing changes until the user answers, so Cancel has something to cancel.
  pendingScreenFormat: PendingScreenFormat | null;
};

export type PendingScreenFormat = {
  formatId: ScreenFormatId | null;
  videoStandard: VideoStandard;
  colors: number;
  trueColorEnabled: boolean;
  paletteSource: 'current' | 'image';
  // the canvas size the chosen screen implies
  target: { width: number; height: number };
};

// What the display side of a document starts as. Named because the new-page
// gesture (app.newPicture) restores exactly these, and "default" should have
// one definition rather than a literal here and a guess there.
//
// scaleMode is deliberately not among them: it is how the simulated screen
// fills the window, a preference owned by a menu toggle and meaningless at
// Native, and the autosave record does not carry it either. These three it
// does carry — they belong to the picture.
export const DEFAULT_SCREEN_FORMAT_ID: ScreenFormatId | null = null;
export const DEFAULT_VIDEO_STANDARD: VideoStandard = 'PAL';
export const DEFAULT_TRUE_COLOR_ENABLED = true;

export const state: State = {
  resolution: { width: 0, height: 0 },
  screenFormatId: DEFAULT_SCREEN_FORMAT_ID,
  videoStandard: DEFAULT_VIDEO_STANDARD,
  scaleMode: 'stretch',
  pixelAspect: derived((state: State) =>
    state.screenFormatId
      ? {
          x: screenFormats[state.screenFormatId].aspectX,
          y: screenFormats[state.screenFormatId].aspectY,
        }
      : { x: 1, y: 1 }
  ),
  scrollFocusPoint: null,
  zoomFocusPoint: null,
  displayScale: { x: 1, y: 1 },
  viewportSize: { width: 0, height: 0 },
  hasTrueColorPixels: false,
  trueColorEnabled: DEFAULT_TRUE_COLOR_ENABLED,
  pendingScreenFormat: null,
};
