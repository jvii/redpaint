import { RefObject, useEffect } from 'react';
import { TextFace, outlineRun, textRun } from '../../domain/PixelFont';
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
  face: TextFace,
  sample: string,
  outline: boolean,
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

    const rasterized = textRun(face, sample);
    const run = outline ? outlineRun(rasterized) : rasterized;
    if (run.width === 0 || run.height === 0) {
      return;
    }

    // Whole-number zoom only, and never below 1: a fractional scale would
    // resample the very pixel grid the preview exists to show. Small sizes get
    // magnified so their broken stems are visible rather than merely small;
    // large ones sit at 1:1 and are clipped by the box if they overrun, which
    // is honest about the width they will take on the canvas.
    const zoom = Math.max(1, Math.floor(Math.min(boxWidth / run.width, boxHeight / run.height)));
    // Centred while it fits, pinned left once it does not: a sample too wide
    // for the box and still centred loses its first letter as well as its
    // last, which reads as a bug rather than as text running off the edge.
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
    // `face` is depended on by identity, so the caller memoizes it: built
    // fresh each render it would repaint the preview on every unrelated
    // state change.
  }, [
    canvasRef,
    face,
    sample,
    outline,
    foreground,
    background,
    boxWidth,
    boxHeight,
  ]);
}
