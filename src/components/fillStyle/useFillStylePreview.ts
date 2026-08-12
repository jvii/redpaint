import { RefObject, useEffect, useMemo, useRef } from 'react';
import { useAppState } from '../../overmind';
import { symmetricFilledEllipse } from '../../algorithm/shape';
import { rowSpansFromLines } from '../../algorithm/rowSpans';
import { patternFillStore } from '../../brush/PatternFill';
import { beginPreviewFrame, useFillPreviewGL } from './fillPreviewGL';

// The Fill Style dialog's live preview swatch: a filled ellipse painted in the
// current (uncommitted-until-OK) fill style, redrawn whenever anything it
// depends on changes. A circle rather than a flat rect shows the Horizontal
// Line axis's per-row contour-hugging "3-D" look, which is otherwise easy to
// misjudge from the axis name alone.
//
// Renders through the same WebGL renderer classes the overlay canvas uses for
// its live drag preview, not a separate 2D reimplementation, so the swatch
// cannot drift from what actually gets painted. It did once, dithering via
// Math.random() where the shader uses a deterministic hash.
//
// Split out of FillStyleSettings.tsx, which is otherwise plain layout: this is
// the only part of that dialog owning a GL context and a lifecycle.
export function useFillStylePreview(
  canvasRef: RefObject<HTMLCanvasElement>,
  previewWidth: number,
  previewHeight: number,
  displayScale: { x: number; y: number },
  displaySize: number
): void {
  const state = useAppState();

  const glRef = useFillPreviewGL(canvasRef);
  const seedRef = useRef(Math.random() * 8);

  // An ellipse, not a circle: previewWidth/previewHeight are not generally
  // equal, so the raw radii pre-compensate per axis for the CSS stretch each
  // gets in the fixed square box.
  //
  // Clamped to at least 2 raw pixels of margin per axis: at low raw resolution
  // the 2 CSS px margin shrinks below a raw pixel once divided by displayScale,
  // and the ellipse's edge would land past the buffer's bounds, where WebGL
  // clips it into a flat last row rather than a slightly-too-big curve.
  const onScreenRadius = displaySize / 2 - 2;
  const radiusX = Math.min(onScreenRadius / displayScale.x, previewWidth / 2 - 2);
  const radiusY = Math.min(onScreenRadius / displayScale.y, previewHeight / 2 - 2);

  // Rounded to whole pixels: the row-span table Gradient/Pattern look up is
  // center-relative and the shader reconstructs local coords as `pix -
  // u_center`, a translation that only preserves the shape for an integer
  // center. At a half-integer one (any odd raw dimension) the three fill modes
  // disagree by a row and a couple of columns. Every real fill passes an
  // integer center anyway; this costs half a pixel of centering.
  const center = useMemo(
    () => ({ x: Math.round(previewWidth / 2), y: Math.round(previewHeight / 2) }),
    [previewWidth, previewHeight]
  );

  // Built from the same symmetricFilledEllipse the Solid branch draws with and
  // handed to Gradient/Pattern as an override, so all three fill modes share
  // one shape: at this preview's low raw resolution they otherwise look visibly
  // different.
  //
  // Memoized on the radii: RowSpanTexture caches the override by table
  // identity, so a stable table keeps a dialog left open during color cycling
  // from re-uploading it every frame.
  const rowSpanOverride = useMemo(
    () => rowSpansFromLines(symmetricFilledEllipse({ x: 0, y: 0 }, radiusX, radiusY)),
    [radiusX, radiusY]
  );

  useEffect((): void => {
    const ctx = glRef.current;
    if (!ctx) {
      return;
    }
    const { gl, geometric, gradient, pattern } = ctx;

    const { palette, ranges, cycleOffsets } = state.palette;
    beginPreviewFrame(gl, palette, ranges, cycleOffsets, previewWidth, previewHeight);

    const style = state.fillStyle.effectiveFillStyle;
    if (state.fillStyle.mode === 'brush' && patternFillStore.pattern) {
      pattern.renderPatternFill(
        { kind: 'ellipse', center, radiusX, radiusY, rotationAngle: 0 },
        patternFillStore.pattern.brushColorIndex,
        patternFillStore.version,
        rowSpanOverride
      );
    } else if (!style) {
      geometric.renderLines(
        symmetricFilledEllipse(center, radiusX, radiusY),
        state.tool.activePaintColor
      );
    } else {
      gradient.renderGradientFill(
        { kind: 'ellipse', center, radiusX, radiusY, rotationAngle: 0 },
        style,
        seedRef.current,
        rowSpanOverride
      );
    }
  }, [
    state.fillStyle.mode,
    state.fillStyle.effectiveFillStyle,
    state.fillStyle.hasPattern,
    state.fillStyle.patternVersion,
    state.palette.palette,
    state.palette.ranges,
    state.palette.cycleOffsets,
    state.tool.activePaintColor,
    previewWidth,
    previewHeight,
    center,
    radiusX,
    radiusY,
    rowSpanOverride,
  ]);
}
