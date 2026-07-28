import { RefObject, useEffect, useRef } from 'react';
import { useAppState } from '../../overmind';
import { patternFillStore } from '../../brush/PatternFill';
import { beginPreviewFrame, useFillPreviewGL } from './fillPreviewGL';

// The menubar's Color Fill Box: a rectangle filled in the current fill style,
// DPaint's own bit of user feedback for a fill type that the palette can't
// show you (DP2 manual §4.25 — "displays the currently selected fill pattern,
// or perspective fill or gradient fill… previews the pattern or gradient you
// will get when you fill a shape").
//
// A rectangle, unlike the Fill Style requester's ellipse (useFillStylePreview),
// because at menubar size there is no room for a shape whose point is showing
// how Horizontal Line hugs a contour — here the axis reads from the direction
// of the bands alone. That also means no row-span override and no shape
// rasterization: 'rect' is a shape kind both fill shaders handle natively.
//
// Draws only when a fill would actually come out patterned or gradient
// (state.fillStyle.effectiveMode) — the caller unmounts the swatch entirely
// otherwise, matching "The Color Fill Box is absent if fill mode is set to
// normal".
export function useFillStyleSwatch(
  canvasRef: RefObject<HTMLCanvasElement>,
  width: number,
  height: number
): void {
  const state = useAppState();

  const glRef = useFillPreviewGL(canvasRef);
  // Fixed per mount, like the requester preview's: the dither hash is seeded
  // per fill, so re-seeding on every redraw would make the swatch's noise
  // crawl under color cycling rather than stand still.
  const seedRef = useRef(Math.random() * 8);

  useEffect((): void => {
    const ctx = glRef.current;
    if (!ctx) {
      return;
    }
    const { gl, gradient, pattern } = ctx;

    const { palette, ranges, cycleOffsets } = state.palette;
    beginPreviewFrame(gl, palette, ranges, cycleOffsets, width, height);

    // The whole buffer, corner to corner — inclusive pixel bounds, so the far
    // edge is the last pixel rather than one past it.
    const shape = {
      kind: 'rect' as const,
      start: { x: 0, y: 0 },
      end: { x: width - 1, y: height - 1 },
    };

    const { effectiveMode, effectiveFillStyle } = state.fillStyle;
    if (effectiveMode === 'pattern' && patternFillStore.pattern) {
      pattern.renderPatternFill(
        shape,
        patternFillStore.pattern.brushColorIndex,
        patternFillStore.version
      );
    } else if (effectiveMode === 'gradient' && effectiveFillStyle) {
      gradient.renderGradientFill(shape, effectiveFillStyle, seedRef.current);
    }
  }, [
    glRef,
    state.fillStyle.effectiveMode,
    state.fillStyle.effectiveFillStyle,
    state.fillStyle.patternVersion,
    state.palette.palette,
    state.palette.ranges,
    state.palette.cycleOffsets,
    width,
    height,
  ]);
}
