import { JSX, useEffect, useRef } from 'react';
import './FillStyleSettings.css';
import { useActions, useAppState } from '../../overmind';
import { GradientAxis } from '../../algorithm/gradientFill';
import { paletteTextureData } from '../../algorithm/cycle';
import { FillMode } from '../../overmind/fillStyle/state';
import { Point } from '../../types';
import { LineH } from '../../domain/LineH';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroFieldset } from '../ui/RetroFieldset';
import { RetroToggle } from '../ui/RetroToggle';
import { RetroLabeledSlider } from '../ui/RetroLabeledSlider';
import { OverlayGeometricRenderer } from '../../canvas/overlayCanvas/program/OverlayGeometricRenderer';
import { OverlayGradientRenderer } from '../../canvas/overlayCanvas/program/OverlayGradientRenderer';
import { OverlayPatternRenderer } from '../../canvas/overlayCanvas/program/OverlayPatternRenderer';
import { patternFillStore } from '../../brush/PatternFill';
import {
  GradientHorizontalIcon,
  GradientHorizontalLineIcon,
  GradientVerticalIcon,
} from './gradientAxisIcons';

// A filled ellipse via a direct per-row distance test, not
// algorithm/shape.ts's filledEllipse: that function solves for each row's
// boundary x with a quadratic formula and rounds the two roots
// independently (Math.round), which isn't symmetric for a fractional root
// (JS always rounds .5 up, so e.g. round(3.5)=4 but round(-3.5)=-3) — fine
// for real brush strokes, but this preview swatch specifically needs to
// look centered, and that asymmetry became clearly visible at the low raw
// resolutions a low-density screen format zoomed into a large window can
// produce (see previewWidth/Height's comment). Testing each pixel's own
// center against the ellipse equation directly has no such bias: the test
// is symmetric in (x - center) by construction, whichever side of center a
// pixel falls on.
function symmetricFilledEllipse(
  center: Point,
  radiusX: number,
  radiusY: number
): LineH[] {
  const lines: LineH[] = [];
  const yStart = Math.floor(center.y - radiusY);
  const yEnd = Math.ceil(center.y + radiusY);
  for (let y = yStart; y <= yEnd; y++) {
    const dy = (y + 0.5 - center.y) / radiusY;
    if (Math.abs(dy) > 1) {
      continue;
    }
    const dxMax = radiusX * Math.sqrt(1 - dy * dy);
    const xStart = Math.ceil(center.x - dxMax - 0.5);
    const xEnd = Math.floor(center.x + dxMax - 0.5);
    if (xEnd >= xStart) {
      lines.push(new LineH({ x: xStart, y }, { x: xEnd, y }));
    }
  }
  return lines;
}

// Icons, not text, per axis — a deliberate exception to RetroToggle's usual
// text-only segments (see docs/style-guide.md), matching DPaint's Fill Type
// requester where the axis is an arrow glyph rather than a word.
const AXIS_OPTIONS: { value: GradientAxis; label: JSX.Element; title: string }[] = [
  { value: 'vertical', label: <GradientVerticalIcon />, title: 'Vertical' },
  { value: 'horizontal', label: <GradientHorizontalIcon />, title: 'Horizontal' },
  { value: 'horizontalLine', label: <GradientHorizontalLineIcon />, title: 'Horizontal Line' },
];

// CSS px — the preview's display box is a fixed PREVIEW_DISPLAY_SIZE square
// regardless of screen format or window shape (using the layout space DPaint
// itself would use for this, not shrinking on one axis to match whatever
// the raw buffer's aspect happens to be — see previewWidth/Height's comment
// for how the raw buffer can end up a very different shape than the box).
const PREVIEW_DISPLAY_SIZE = 260;

// The fill style requester — redpaint's equivalent of DPaint's Fill Type
// dialog, opened by right-clicking the flood fill button or any filled
// shape tool button (they all edit the same shared style, like DPaint).
// Solid / Gradient for now; Pattern ("from brush") is a planned third mode.
export function FillStyleSettings(): JSX.Element | null {
  const state = useAppState();

  if (!state.fillStyle.settingsOpen) {
    return null;
  }
  // remounts on every open, so the preview effect below always starts fresh
  return <FillStyleSettingsOpen />;
}

function FillStyleSettingsOpen(): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  // The swatch's raw pixel count, sized so it shows an equally-sized window
  // into the real canvas — the display box's fixed physical size
  // (PREVIEW_DISPLAY_SIZE CSS px) divided by MainCanvas's actual current
  // displayScale (CSS px per raw canvas px, mirrored into Overmind — see
  // overmind/canvas/state.ts). That value already folds in devicePixelRatio
  // (Native mode), the screen format's pixel aspect, AND the live window
  // size (a Lo-Res canvas shown zoomed into a large window has far fewer
  // raw pixels in a 220px swatch than the same canvas at 1:1 would). Unlike
  // the display box, this raw buffer is free to end up a very different
  // shape per axis (displayScale.x and .y aren't generally equal) — the
  // circle drawn into it below compensates for that with an ellipse, rather
  // than the box shrinking on one axis to chase the buffer's own aspect
  // (which wasted the dialog's available width whenever that aspect got
  // narrow). Read once here (not inside the mount effect below) purely so
  // both that effect and the render-time JSX canvas attributes agree on the
  // same numbers.
  const displayScale = state.canvas.displayScale;
  const previewWidth = Math.round(PREVIEW_DISPLAY_SIZE / displayScale.x);
  const previewHeight = Math.round(PREVIEW_DISPLAY_SIZE / displayScale.y);

  // A filled circle swatch previewing the current (uncommitted-until-OK)
  // fill style live — a circle rather than a flat rect shows the
  // Horizontal Line axis's per-row contour-hugging "3-D" look, which is
  // otherwise easy to misjudge from the axis name alone. Renders through
  // the exact same WebGL renderer classes the overlay canvas uses for its
  // live drag preview (OverlayGeometricRenderer for solid,
  // OverlayGradientRenderer for gradient) rather than a separate CPU/2D
  // reimplementation, so this swatch can never drift out of sync with what
  // actually gets painted (it did once: this preview used to dither via
  // bucketPointsByGradient's Math.random(), a different algorithm from the
  // GPU shader's deterministic hash that ships the real gradient fill).
  const previewRef = useRef<HTMLCanvasElement>(null);
  const previewGlRef = useRef<{
    gl: WebGLRenderingContext;
    geometric: OverlayGeometricRenderer;
    gradient: OverlayGradientRenderer;
    pattern: OverlayPatternRenderer;
  } | null>(null);
  const previewSeedRef = useRef(Math.random() * 8);

  // One-time setup per dialog mount: WebGL context, a shared vertex buffer
  // (bound once — every renderer's draw call assumes ARRAY_BUFFER is
  // already bound, same as the real overlay canvas setup), and a palette
  // texture at unit 1, mirroring OverlayCanvasController's initPaletteTexture.
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) {
      return;
    }
    // width/height are set as JSX attributes (not here) so the canvas never
    // has an unset, mismatched-with-CSS intrinsic size for Safari to lay
    // out the modal against before this effect runs — Safari doesn't always
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

    previewGlRef.current = {
      gl,
      geometric: new OverlayGeometricRenderer(gl),
      gradient: new OverlayGradientRenderer(gl),
      pattern: new OverlayPatternRenderer(gl),
    };

    return (): void => {
      previewGlRef.current?.geometric.dispose();
      previewGlRef.current?.gradient.dispose();
      previewGlRef.current?.pattern.dispose();
      gl.deleteTexture(paletteTex);
      gl.deleteBuffer(vertexBuffer);
      previewGlRef.current = null;
    };
  }, []);

  useEffect((): void => {
    const ctx = previewGlRef.current;
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

    const center = { x: previewWidth / 2, y: previewHeight / 2 };
    // An ellipse, not a circle: previewWidth/previewHeight aren't generally
    // equal (see their comment), so a shape drawn on-screen-radius R needs
    // per-axis raw radii that pre-compensate for the CSS stretch each axis
    // gets when this non-square buffer is displayed in the fixed square box
    // — otherwise it'd render as a circle in raw-buffer space but a
    // stretched ellipse once the browser scales it up to the display box.
    const onScreenRadius = PREVIEW_DISPLAY_SIZE / 2 - 2;
    // Clamped to at least 2 raw pixels of margin on each axis: at low raw
    // resolution (a low-density screen format zoomed into a large window —
    // see previewWidth/Height's comment) the 2 CSS px margin above shrinks
    // to a fraction of a single raw pixel once divided by displayScale, so
    // without this the ellipse's edge could land past the buffer's actual
    // bounds — WebGL then just clips it (a flat edge on the last row/
    // column) rather than drawing a slightly-too-big curve.
    const radiusX = Math.min(onScreenRadius / displayScale.x, previewWidth / 2 - 2);
    const radiusY = Math.min(onScreenRadius / displayScale.y, previewHeight / 2 - 2);
    const style = state.fillStyle.effectiveFillStyle;
    if (state.fillStyle.mode === 'brush' && patternFillStore.pattern) {
      pattern.renderPatternFill(
        { kind: 'ellipse', center, radiusX, radiusY, rotationAngle: 0 },
        patternFillStore.pattern.brushColorIndex,
        patternFillStore.version
      );
    } else if (!style) {
      // symmetricFilledEllipse, not the real solid-fill path's filledEllipse
      // — see its comment for why
      geometric.renderLines(
        symmetricFilledEllipse(center, radiusX, radiusY),
        state.tool.activePaintColor
      );
    } else {
      gradient.renderGradientFill(
        { kind: 'ellipse', center, radiusX, radiusY, rotationAngle: 0 },
        style,
        previewSeedRef.current
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
    displayScale.x,
    displayScale.y,
  ]);

  const isGradient = state.fillStyle.mode === 'gradient';
  const isPattern = state.fillStyle.mode === 'brush';

  return (
    <Modal header="Fill Style">
      <div className="fill-style-settings__body">
        <div className="fill-style-settings__top">
          <canvas
            ref={previewRef}
            width={previewWidth}
            height={previewHeight}
            className="fill-style-settings__preview"
          />
          <RetroFieldset legend="Fill">
            <RetroToggle
              variant="column"
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'brush', label: 'Pattern' },
                { value: 'gradient', label: 'Gradient' },
              ]}
              value={state.fillStyle.mode}
              onChange={(value): void => actions.fillStyle.setMode(value as FillMode)}
            />
          </RetroFieldset>
        </div>
        <RetroFieldset
          legend="Pattern"
          bordered
          as="div"
          className="fill-style-settings__pattern-box"
        >
          <RetroButton
            variant="basic"
            disabled={!isPattern}
            onClick={actions.fillStyle.captureFromBrush}
          >
            From Brush
          </RetroButton>
          <span className="fill-style-settings__hint">
            {!state.fillStyle.hasPattern
              ? 'No pattern captured yet — pick a brush, then click From Brush.'
              : 'From Brush tiles the current brush across the fill.'}
          </span>
        </RetroFieldset>
        {/* as="div" throughout this whole group, not just Range/Dither/
            Jitter: a real <fieldset> — even this outer one, on its own,
            with no flex directly on it and nothing nested inside it —
            still shows a smaller residual version of the same Safari
            auto-height bug their nesting caused. Since nothing here relies
            on native fieldset disabling (every control takes its own
            explicit `disabled` prop), there's no downside to using plain
            divs the whole way down. */}
        <RetroFieldset
          legend="Gradient"
          bordered
          as="div"
          className="fill-style-settings__gradient-box"
        >
          <RetroToggle
            variant="row"
            options={AXIS_OPTIONS}
            value={state.fillStyle.axis}
            onChange={(value): void => actions.fillStyle.setAxis(value as GradientAxis)}
            disabled={!isGradient}
          />
          <span className="fill-style-settings__hint">
            Use the palette to select a color from a Range to create a gradient. Ranges are set in
            the Palette Editor.
          </span>
          <RetroFieldset legend="Dither" className="fill-style-settings__dither" as="div">
            <RetroLabeledSlider
              label=""
              vertical={false}
              value={state.fillStyle.dither}
              min={0}
              max={20}
              onChange={(value): void => actions.fillStyle.setDither(value)}
              disabled={!isGradient}
            />
            <span className="fill-style-settings__hint">
              How much adjacent bands randomly blend at their boundary. 0 = hard edges
            </span>
          </RetroFieldset>
          <RetroFieldset legend="Jitter" className="fill-style-settings__dither" as="div">
            <RetroLabeledSlider
              label=""
              vertical={false}
              value={state.fillStyle.jitter}
              min={0}
              max={50}
              onChange={(value): void => actions.fillStyle.setJitter(value)}
              disabled={!isGradient}
            />
            <span className="fill-style-settings__hint">
              How far dither can push a pixel, as a % of a band's width.
            </span>
          </RetroFieldset>
        </RetroFieldset>
      </div>
      <RetroButton variant="secondary" onClick={actions.fillStyle.cancelSettings}>
        Cancel
      </RetroButton>
      <RetroButton variant="primary" onClick={actions.fillStyle.closeSettings}>
        OK
      </RetroButton>
    </Modal>
  );
}
