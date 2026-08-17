import { RefObject, useEffect } from 'react';
import { FontSpec } from '../../algorithm/glyphRaster';
import { outlineRun, runAdvance, textRun, underlineRun } from '../../domain/PixelFont';
import { Color } from '../../types';
import { colorToRGBString } from '../../algorithm/color';

// Paints the font preview: the sample string put through the same rasterizer
// the canvas gets, one bit per pixel, blown up by a whole-number zoom.
//
// Deliberately not CSS text in the chosen family. The question at this
// requester is whether a face survives being thresholded at a given size, and
// a smoothly-rendered DOM sample answers a different one — it would look good
// at 8px where the tool cannot, which is exactly the size someone needs
// warning about. Rasterizing here means the preview is wrong only if the
// canvas is wrong too.
export function useFontPreview(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  spec: FontSpec,
  sample: string,
  outline: boolean,
  underline: boolean,
  foreground: Color,
  background: Color,
  boxWidth: number,
  boxHeight: number
): void {
  useEffect((): void => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.fillStyle = colorToRGBString(background);
    ctx.fillRect(0, 0, boxWidth, boxHeight);

    const rasterized = textRun(spec, sample);
    // Same order the tool stamps in (TextTool.brushFor): underline first, so
    // both on outlines the rule too.
    const underlined = underline
      ? underlineRun(rasterized, runAdvance(spec, sample), spec.size)
      : rasterized;
    const run = outline ? outlineRun(underlined) : underlined;
    if (run.width === 0 || run.height === 0) {
      return;
    }

    // 1:1 with the canvas. The buffer this draws into is sized to the box
    // divided by the canvas's own displayScale (FontRequester.tsx), and the
    // CSS box then scales it back up by exactly that — so a pixel here covers
    // the same screen area as a pixel of the picture, and the sample is the
    // size the text will actually be. The same window-into-the-canvas the fill
    // style swatch is.
    //
    // Nothing is fitted to the box, deliberately. Scaling to fit made the
    // preview magnify small sizes more than large ones, so the apparent size
    // ran backwards against the size chosen — Arial showed 8px at 40 pixels
    // tall and 24px at 24, and Press Start 2P showed 8 and 16 identically,
    // making the control look inert. A big size overruns and is clipped, which
    // is the truthful answer to how much room it takes.
    const zoom = 1;
    const overruns = run.width * zoom > boxWidth;
    const originX = overruns ? 0 : Math.floor((boxWidth - run.width * zoom) / 2);
    const originY = Math.floor((boxHeight - run.height * zoom) / 2);

    ctx.fillStyle = colorToRGBString(foreground);
    for (let y = 0; y < run.height; y++) {
      for (let x = 0; x < run.width; x++) {
        if (run.bits[y * run.width + x]) {
          ctx.fillRect(originX + x * zoom, originY + y * zoom, zoom, zoom);
        }
      }
    }
    // `spec` is depended on by identity, so the caller memoizes it: built
    // fresh each render it would repaint the preview on every unrelated
    // state change.
  }, [canvasRef, spec, sample, outline, underline, foreground, background, boxWidth, boxHeight]);
}
