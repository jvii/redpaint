import { derived } from 'overmind';
import { Point } from '../../types';

// The Amiga screen formats of DPaint's Choose Screen Format requester. A real
// Amiga ran one broadcast standard at a time, so the standard is a switch here
// rather than 8 format entries: the same 4 formats, with PAL or NTSC deciding
// which pixel dimensions they mean.
//
// aspectX/aspectY describe the pixel's display shape relative to a square
// Lo-Res pixel: Med-Res is half-wide, Interlace half-tall, Hi-Res both. That
// holds within either standard's own frame, so unlike width/height it needs no
// PAL/NTSC split.
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

// Finds the standard format whose exact pixel dimensions match, to auto-select
// one for an image that happens to be a standard Amiga size (beginIlbmLoad).
// Checks both standards, so an NTSC-sized image selects NTSC.
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
//  - 'aspect': one whole-number scale, applied to the format's pixel shape, so
//    a pixel is a uniform block of the proportions the format names — 1x1 on
//    Lo-Res and Hi-Res, 1x2 on Med-Res, 2x1 on Interlace. Costs a margin until
//    the window is enlarged. See docs/pixel-aspect.md.
//  - 'stretch': fill the window on both axes with a fractional scale. No
//    margin, and the most drawing area a window can give, but the shape is the
//    window's rather than the format's and pixels aren't uniform blocks.
export type ScaleMode = 'aspect' | 'stretch';

export type State = {
  // the canvas: the actual pixel bitmap being painted (GL drawing buffer size)
  resolution: { width: number; height: number };
  // the simulated screen: null means no simulation. The canvas is shown 1:1 in
  // the browser window (the startup behavior). With a format selected, the main
  // canvas is scaled so one screenful of the canvas fills the window, and a
  // canvas larger than the screen scrolls.
  screenFormatId: ScreenFormatId | null;
  // which broadcast standard's pixel dimensions the 4 formats above resolve to
  // (see resolveScreenFormat): a real Amiga only ran one at a time
  videoStandard: VideoStandard;
  scaleMode: ScaleMode;
  // the active format's pixel display shape ({1,1} when no format): every
  // CSS size derived from the resolution gets multiplied by this so e.g.
  // Med-Res pixels render half as wide as they are tall
  pixelAspect: { x: number; y: number };
  scrollFocusPoint: Point | null;
  zoomFocusPoint: Point | null;
  // The area the drawing pane sits in, which is the pane itself unless the zoom
  // view is open and taking part of it. What a canvas "fitted to the window"
  // means, as against viewportSize, which is what the pane happens to be now.
  paneAreaSize: { width: number; height: number };
  // Mirror of MainCanvas's displayScale (CSS px per buffer px, per axis),
  // computed there from the live pane size and kept locally for its own render.
  // Mirrored so other UI (the Fill Style preview) can see the canvas's current
  // pixel density. {1,1} until the canvas has mounted once.
  displayScale: Point;
  // The main drawing pane's size in artwork pixels (CSS box times device pixel
  // ratio). What "fit to window" means at Native. Mirrored from MainCanvas for
  // the same reason displayScale is: the Canvas Size requester cannot measure
  // that pane itself. {0,0} until the canvas has mounted once.
  viewportSize: { width: number; height: number };
  // Whether the committed canvas holds any true-color pixels. Maintained by the
  // undo actions: every committed change passes through setUndoPoint, and
  // undo/redo restore the answer memoized on the snapshot they move to.
  hasTrueColorPixels: boolean;
  // Whether the document allows true-color pixels (the True Color switch in the
  // Screen Format requester). Switching it off conforms the canvas to the
  // palette; loading an image as True Color switches it back on.
  trueColorEnabled: boolean;
  // A screen format change that would shrink the canvas (and so lose pixels) is
  // held here *unapplied* while the Resize/Crop/Keep/Cancel question is up.
  // Nothing changes until the user answers, so Cancel has something to cancel.
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

// The size a canvas takes when its screen has no page size of its own: the
// drawing pane, or its own current size if the pane has never been measured.
// Shared by the two gestures that mean "a fresh page at Native": the new-page
// half of CLR, and switching to Native without keeping the picture.
export function nativeCanvasSize(canvas: {
  paneAreaSize: { width: number; height: number };
  viewportSize: { width: number; height: number };
  resolution: { width: number; height: number };
}): { width: number; height: number } {
  const { paneAreaSize, viewportSize, resolution } = canvas;
  // The whole area, not the drawing pane: with the zoom view open the pane is
  // the half of it left over, and a canvas fitted to that is half a window
  // wide the moment the zoom view closes — which resizing the canvas does
  // (setResolution). Everything that asks this means "a canvas for the
  // window", and the window is the area.
  if (paneAreaSize.width > 0 && paneAreaSize.height > 0) {
    return paneAreaSize;
  }
  return viewportSize.width > 0 && viewportSize.height > 0 ? viewportSize : resolution;
}

// What the display side of a document starts as; the new-page gesture
// (app.newPicture) restores exactly these. scaleMode is not among them: it is a
// view preference owned by a menu toggle, and the autosave record does not
// carry it either. These three it does: they belong to the picture.
export const DEFAULT_SCREEN_FORMAT_ID: ScreenFormatId | null = null;
export const DEFAULT_VIDEO_STANDARD: VideoStandard = 'PAL';
export const DEFAULT_TRUE_COLOR_ENABLED = true;

export const state: State = {
  resolution: { width: 0, height: 0 },
  screenFormatId: DEFAULT_SCREEN_FORMAT_ID,
  videoStandard: DEFAULT_VIDEO_STANDARD,
  scaleMode: 'aspect',
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
  paneAreaSize: { width: 0, height: 0 },
  displayScale: { x: 1, y: 1 },
  viewportSize: { width: 0, height: 0 },
  hasTrueColorPixels: false,
  trueColorEnabled: DEFAULT_TRUE_COLOR_ENABLED,
  pendingScreenFormat: null,
};
