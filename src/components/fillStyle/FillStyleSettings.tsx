import { JSX, useEffect, useRef } from 'react';
import './FillStyleSettings.css';
import { useActions, useAppState } from '../../overmind';
import { GradientAxis, bucketPointsByGradient } from '../../algorithm/gradientFill';
import { filledCircle } from '../../algorithm/shape';
import { FillMode } from '../../overmind/fillStyle/state';
import { Point } from '../../types';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroFieldset } from '../ui/RetroFieldset';
import { RetroToggle } from '../ui/RetroToggle';
import { RetroLabeledSlider } from '../ui/RetroLabeledSlider';

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
  // otherwise easy to misjudge from the axis name alone. Solid mode
  // previews as one flat fill of the foreground color, same as it would
  // actually paint.
  const previewRef = useRef<HTMLCanvasElement>(null);
  useEffect((): void => {
    const canvas = previewRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }
    canvas.width = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;
    const center = { x: PREVIEW_SIZE / 2, y: PREVIEW_SIZE / 2 };
    const points = filledCircle(center, PREVIEW_SIZE / 2 - 2).flatMap((line) => line.asPoints());

    const out = ctx.createImageData(PREVIEW_SIZE, PREVIEW_SIZE);
    const paint = (point: Point, color: { r: number; g: number; b: number }): void => {
      if (point.x < 0 || point.x >= PREVIEW_SIZE || point.y < 0 || point.y >= PREVIEW_SIZE) {
        return;
      }
      const i = (point.y * PREVIEW_SIZE + point.x) * 4;
      out.data[i] = color.r;
      out.data[i + 1] = color.g;
      out.data[i + 2] = color.b;
      out.data[i + 3] = 255;
    };

    const style = state.fillStyle.effectiveFillStyle;
    if (!style) {
      for (const point of points) {
        paint(point, state.palette.foregroundColor);
      }
    } else {
      for (const [colorId, bucketPoints] of bucketPointsByGradient(points, style)) {
        const color = state.palette.paletteArray[colorId - 1];
        if (!color) {
          continue;
        }
        for (const point of bucketPoints) {
          paint(point, color);
        }
      }
    }
    ctx.putImageData(out, 0, 0);
  }, [
    state.fillStyle.effectiveFillStyle,
    state.palette.paletteArray,
    state.palette.foregroundColor,
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
          <canvas ref={previewRef} className="fill-style-settings__preview" />
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
        <RetroFieldset legend="Gradient" bordered className="fill-style-settings__gradient-box">
          <RetroToggle
            variant="column"
            options={AXIS_OPTIONS}
            value={state.fillStyle.axis}
            onChange={(value): void => actions.fillStyle.setAxis(value as GradientAxis)}
            disabled={!isGradient}
          />
          <RetroFieldset legend="Range" className="fill-style-settings__range">
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
          <RetroFieldset legend="Dither" className="fill-style-settings__dither">
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
          <RetroFieldset legend="Jitter" className="fill-style-settings__dither">
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
