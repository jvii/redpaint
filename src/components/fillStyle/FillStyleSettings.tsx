import { JSX, useEffect, useRef } from 'react';
import './FillStyleSettings.css';
import { useActions, useAppState } from '../../overmind';
import { GradientAxis } from '../../algorithm/gradientFill';
import { filledCircle } from '../../algorithm/shape';
import { paletteTextureData } from '../../algorithm/cycle';
import { FillMode } from '../../overmind/fillStyle/state';
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

// Icons, not text, per axis — a deliberate exception to RetroToggle's usual
// text-only segments (see docs/style-guide.md), matching DPaint's Fill Type
// requester where the axis is an arrow glyph rather than a word.
const AXIS_OPTIONS: { value: GradientAxis; label: JSX.Element; title: string }[] = [
  { value: 'vertical', label: <GradientVerticalIcon />, title: 'Vertical' },
  { value: 'horizontal', label: <GradientHorizontalIcon />, title: 'Horizontal' },
  { value: 'horizontalLine', label: <GradientHorizontalLineIcon />, title: 'Horizontal Line' },
];

const PREVIEW_SIZE = 100; // canvas resolution; scaled up to fill-style-settings.css's display size

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
    // antialiasing blends adjacent scanline rows (filledCircle's fill
    // technique) at their edges, and image-rendering: pixelated then
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

    gl.viewport(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const center = { x: PREVIEW_SIZE / 2, y: PREVIEW_SIZE / 2 };
    const radius = PREVIEW_SIZE / 2 - 2;
    const style = state.fillStyle.effectiveFillStyle;
    if (state.fillStyle.mode === 'brush' && patternFillStore.pattern) {
      pattern.renderPatternFill(
        { kind: 'circle', center, radius },
        patternFillStore.pattern.brushColorIndex,
        patternFillStore.version
      );
    } else if (!style) {
      // same call solid-mode fills make for real: filledCircle rasterized
      // to lines, drawn with the current paint color
      geometric.renderLines(filledCircle(center, radius), state.tool.activePaintColor);
    } else {
      gradient.renderGradientFill(
        { kind: 'circle', center, radius },
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
  ]);

  const isGradient = state.fillStyle.mode === 'gradient';
  const isPattern = state.fillStyle.mode === 'brush';

  return (
    <Modal header="Fill Style">
      <div className="fill-style-settings__body">
        <div className="fill-style-settings__top">
          <canvas
            ref={previewRef}
            width={PREVIEW_SIZE}
            height={PREVIEW_SIZE}
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
