import { RefObject, useEffect, useMemo, useRef } from 'react';
import { useAppState } from '../../overmind';
import { paletteTextureData } from '../../algorithm/cycle';
import { symmetricFilledEllipse } from '../../algorithm/shape';
import { rowSpansFromLines } from '../../algorithm/rowSpans';
import { OverlayGeometricRenderer } from '../../canvas/overlayCanvas/program/OverlayGeometricRenderer';
import { OverlayGradientRenderer } from '../../canvas/overlayCanvas/program/OverlayGradientRenderer';
import { OverlayPatternRenderer } from '../../canvas/overlayCanvas/program/OverlayPatternRenderer';
import { patternFillStore } from '../../brush/PatternFill';

// The Fill Style dialog's live preview swatch: a filled ellipse painted in
// the current (uncommitted-until-OK) fill style, redrawn whenever anything
// it depends on changes. A circle rather than a flat rect shows the
// Horizontal Line axis's per-row contour-hugging "3-D" look, which is
// otherwise easy to misjudge from the axis name alone.
//
// Renders through the exact same WebGL renderer classes the overlay canvas
// uses for its live drag preview (OverlayGeometricRenderer for solid,
// OverlayGradientRenderer / OverlayPatternRenderer for the other two) rather
// than a separate CPU/2D reimplementation, so this swatch can never drift out
// of sync with what actually gets painted (it did once: this preview used to
// dither via bucketPointsByGradient's Math.random(), a different algorithm
// from the GPU shader's deterministic hash that ships the real gradient fill).
//
// Split out of FillStyleSettings.tsx, which is otherwise plain layout — this
// is the only part of that dialog that owns a GL context and a lifecycle.
export function useFillStylePreview(
  canvasRef: RefObject<HTMLCanvasElement>,
  previewWidth: number,
  previewHeight: number,
  displayScale: { x: number; y: number },
  displaySize: number
): void {
  const state = useAppState();

  const glRef = useRef<{
    gl: WebGLRenderingContext;
    geometric: OverlayGeometricRenderer;
    gradient: OverlayGradientRenderer;
    pattern: OverlayPatternRenderer;
  } | null>(null);
  const seedRef = useRef(Math.random() * 8);

  // An ellipse, not a circle: previewWidth/previewHeight aren't generally
  // equal (see FillStyleSettings's own comment on them), so a shape drawn on
  // an on-screen radius R needs per-axis raw radii that pre-compensate for
  // the CSS stretch each axis gets when this non-square buffer is displayed
  // in the fixed square box — otherwise it'd render as a circle in
  // raw-buffer space but a stretched ellipse once the browser scales it up.
  //
  // Clamped to at least 2 raw pixels of margin on each axis: at low raw
  // resolution (a low-density screen format zoomed into a large window) the
  // 2 CSS px margin shrinks to a fraction of a single raw pixel once divided
  // by displayScale, so without this the ellipse's edge could land past the
  // buffer's actual bounds — WebGL then just clips it (a flat edge on the
  // last row/column) rather than drawing a slightly-too-big curve.
  const onScreenRadius = displaySize / 2 - 2;
  const radiusX = Math.min(onScreenRadius / displayScale.x, previewWidth / 2 - 2);
  const radiusY = Math.min(onScreenRadius / displayScale.y, previewHeight / 2 - 2);

  // Rounded to whole pixels, not left at previewWidth/2: the row-span table
  // Gradient/Pattern look up is center-relative, and the shader reconstructs
  // each fragment's local coords as `pix - u_center` — a translation that
  // only preserves the shape for an integer center (see
  // symmetricFilledEllipse's own note). At a half-integer center (any odd raw
  // buffer dimension, a coin flip at the small sizes lo-res produces) the
  // three fill modes would disagree on shape by a row and a couple of
  // columns. Every real fill already passes an integer center (a mouse
  // pixel); this costs at most half a pixel of centering in the display box.
  const center = useMemo(
    () => ({ x: Math.round(previewWidth / 2), y: Math.round(previewHeight / 2) }),
    [previewWidth, previewHeight]
  );

  // Built from the same symmetricFilledEllipse the Solid branch draws with
  // (center-relative: the row-span table format is always local to the
  // shape's own center, see rowSpans.ts) and handed to Gradient/Pattern as an
  // override, so all three fill modes in this swatch share one shape instead
  // of Solid looking visibly different from Gradient/Pattern's real
  // filledEllipse-derived footprint at this preview's low raw resolution.
  //
  // Memoized on the radii, not rebuilt per render: RowSpanTexture caches the
  // override by table identity, so a stable table is what keeps a dialog left
  // open during color cycling from re-uploading it every animation frame.
  const rowSpanOverride = useMemo(
    () => rowSpansFromLines(symmetricFilledEllipse({ x: 0, y: 0 }, radiusX, radiusY)),
    [radiusX, radiusY]
  );

  // One-time setup per dialog mount: WebGL context, a shared vertex buffer
  // (bound once — every renderer's draw call assumes ARRAY_BUFFER is already
  // bound, same as the real overlay canvas setup), and a palette texture at
  // unit 1, mirroring OverlayCanvasController's initPaletteTexture.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    // width/height are set as JSX attributes (not here) so the canvas never
    // has an unset, mismatched-with-CSS intrinsic size for Safari to lay out
    // the modal against before this effect runs — Safari doesn't always
    // reflow an auto-height ancestor when a canvas's size changes
    // imperatively afterward, only once some other change forces a relayout.
    // antialias: false to match the main/overlay canvases — GL_LINES
    // antialiasing blends adjacent scanline rows (symmetricFilledEllipse's
    // fill technique) at their edges, and image-rendering: pixelated then
    // upscales those blended edge pixels into visible dotted artifacts.
    const gl = canvas.getContext('webgl', { antialias: false });
    if (!gl) {
      return;
    }

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    gl.activeTexture(gl.TEXTURE1);
    const paletteTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, paletteTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    glRef.current = {
      gl,
      geometric: new OverlayGeometricRenderer(gl),
      gradient: new OverlayGradientRenderer(gl),
      pattern: new OverlayPatternRenderer(gl),
    };

    return (): void => {
      glRef.current?.geometric.dispose();
      glRef.current?.gradient.dispose();
      glRef.current?.pattern.dispose();
      gl.deleteTexture(paletteTex);
      gl.deleteBuffer(vertexBuffer);
      glRef.current = null;
    };
  }, [canvasRef]);

  useEffect((): void => {
    const ctx = glRef.current;
    if (!ctx) {
      return;
    }
    const { gl, geometric, gradient, pattern } = ctx;

    const { palette, ranges, cycleOffsets } = state.palette;
    gl.activeTexture(gl.TEXTURE1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      256,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      paletteTextureData(palette, ranges, cycleOffsets)
    );

    gl.viewport(0, 0, previewWidth, previewHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

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
