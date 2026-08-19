import { RefObject, useEffect } from 'react';
import { FontSpec } from '../../algorithm/glyphRaster';
import {
  OUTLINE_ROOM,
  outlineRun,
  measureAdvance,
  textRun,
  underlineRun,
} from '../../domain/PixelFont';
import { Color } from '../../types';
import { colorToRGBString } from '../../algorithm/color';

// The sample put through the same rasterizer the canvas gets. Deliberately not
// CSS text: a smooth DOM sample would look good at sizes the tool cannot
// manage, which is exactly where someone needs warning.
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

    const tracking = outline ? OUTLINE_ROOM : 0;
    const rasterized = textRun(spec, sample, tracking);
    // Same order the tool stamps in (TextTool.brushFor): underline first, so
    // both on outlines the rule too.
    const underlined = underline
      ? // Less the tracking after the last glyph: that is room for the next
        // letter, not part of this line.
        underlineRun(
          rasterized,
          Math.max(0, measureAdvance(spec, sample, tracking) - tracking),
          spec.size
        )
      : rasterized;
    const run = outline ? outlineRun(underlined) : underlined;
    if (run.width === 0 || run.height === 0) {
      return;
    }

    // 1:1 with the canvas, the same window into it the fill style swatch is:
    // the buffer is sized to the box divided by displayScale
    // (FontRequester.tsx) and the CSS box scales it back by exactly that.
    //
    // Nothing is fitted to the box. Scaling to fit magnified small sizes more
    // than large ones, so apparent size ran backwards against the size chosen.
    // A big size overruns and is clipped, which is the truthful answer.
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
    // Depended on by identity, so the caller memoizes it.
  }, [canvasRef, spec, sample, outline, underline, foreground, background, boxWidth, boxHeight]);
}
