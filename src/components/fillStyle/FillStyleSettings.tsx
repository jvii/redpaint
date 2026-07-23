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

const AXIS_OPTIONS: { value: GradientAxis; label: string }[] = [
  { value: 'vertical', label: 'Vertical' },
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'horizontalLine', label: 'Horizontal Line' },
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
    };

    return (): void => {
      previewGlRef.current?.geometric.dispose();
      previewGlRef.current?.gradient.dispose();
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
    const { gl, geometric, gradient } = ctx;

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
    if (!style) {
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
    state.fillStyle.effectiveFillStyle,
    state.palette.palette,
    state.palette.ranges,
    state.palette.cycleOffsets,
    state.tool.activePaintColor,
  ]);

  const rangeOptions = state.palette.ranges
    .map((range, index) => ({ range, index }))
    .filter(({ range }) => range !== null)
    .map(({ index }) => ({ value: String(index), label: String(index + 1) }));

  const isGradient = state.fillStyle.mode === 'gradient';

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
                { value: 'gradient', label: 'Gradient' },
              ]}
              value={state.fillStyle.mode}
              onChange={(value): void => actions.fillStyle.setMode(value as FillMode)}
            />
          </RetroFieldset>
        </div>
        <RetroFieldset legend="Gradient" bordered>
          {/* the flex column lives on this plain div, not the fieldset
              itself — a <fieldset> with display:flex directly on it has a
              longstanding Safari bug where its auto-height doesn't always
              recompute after content changes, needing an unrelated later
              reflow to catch up (its internal anonymous content box isn't
              reliably resized). Range/Dither/Jitter below render as div
              (RetroFieldset's `as="div"`) for the same reason: nesting a
              real fieldset inside another fieldset's content — which no
              other dialog in the app does — hits the same bug one level
              deeper. */}
          <div className="fill-style-settings__gradient-box">
            <RetroToggle
              variant="column"
              options={AXIS_OPTIONS}
              value={state.fillStyle.axis}
              onChange={(value): void => actions.fillStyle.setAxis(value as GradientAxis)}
              disabled={!isGradient}
            />
            <RetroFieldset legend="Range" className="fill-style-settings__range" as="div">
              {rangeOptions.length > 0 ? (
                <RetroToggle
                  options={rangeOptions}
                  value={String(state.fillStyle.rangeIndex)}
                  onChange={(value): void => actions.fillStyle.setRangeIndex(Number(value))}
                  disabled={!isGradient}
                />
              ) : (
                <span className="fill-style-settings__hint">
                  No ranges defined — set one in the palette editor.
                </span>
              )}
            </RetroFieldset>
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
          </div>
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
