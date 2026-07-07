import { derived } from 'overmind';
import { Point } from '../../types';

// The Amiga screen formats of DPaint's Choose Screen Format requester.
// aspectX/aspectY describe the pixel's display shape relative to a square
// Lo-Res pixel: Med-Res doubles the horizontal resolution on the same
// physical screen (half-wide pixels), Interlace doubles the vertical
// (half-tall), Hi-Res both — so every format fills the same screen shape,
// 320x256 Lo-Res units.
export type ScreenFormatId = 'loRes' | 'medRes' | 'interlace' | 'hiRes';

export type ScreenFormat = {
  id: ScreenFormatId;
  name: string;
  width: number;
  height: number;
  aspectX: number;
  aspectY: number;
};

export const screenFormats: { [id in ScreenFormatId]: ScreenFormat } = {
  loRes: { id: 'loRes', name: 'Amiga Lo-Res', width: 320, height: 256, aspectX: 1, aspectY: 1 },
  medRes: { id: 'medRes', name: 'Amiga Med-Res', width: 640, height: 256, aspectX: 0.5, aspectY: 1 },
  interlace: {
    id: 'interlace',
    name: 'Amiga Interlace',
    width: 320,
    height: 512,
    aspectX: 1,
    aspectY: 0.5,
  },
  hiRes: { id: 'hiRes', name: 'Amiga Hi-Res', width: 640, height: 512, aspectX: 0.5, aspectY: 0.5 },
};

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
  scaleMode: ScaleMode;
  // the active format's pixel display shape ({1,1} when no format): every
  // CSS size derived from the resolution gets multiplied by this so e.g.
  // Med-Res pixels render half as wide as they are tall
  pixelAspect: { x: number; y: number };
  scrollFocusPoint: Point | null;
  zoomFocusPoint: Point | null;
  loadedImageURL: string;
};

export const state: State = {
  resolution: { width: 0, height: 0 },
  screenFormatId: null,
  scaleMode: 'integer',
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
  loadedImageURL: '',
};
