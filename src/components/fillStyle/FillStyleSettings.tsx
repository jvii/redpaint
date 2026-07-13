import { JSX } from 'react';
import './FillStyleSettings.css';
import { useActions, useAppState } from '../../overmind';
import { GradientAxis } from '../../algorithm/gradientFill';
import { FillMode } from '../../overmind/fillStyle/state';
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

// The fill style requester — redpaint's equivalent of DPaint's Fill Type
// dialog, opened by right-clicking the flood fill button or any filled
// shape tool button (they all edit the same shared style, like DPaint).
// Solid / Gradient for now; Pattern ("from brush") is a planned third mode.
export function FillStyleSettings(): JSX.Element | null {
  const state = useAppState();
  const actions = useActions();

  if (!state.fillStyle.settingsOpen) {
    return null;
  }

  const rangeOptions = state.palette.ranges
    .map((range, index) => ({ range, index }))
    .filter(({ range }) => range !== null)
    .map(({ index }) => ({ value: String(index), label: String(index + 1) }));

  const isGradient = state.fillStyle.mode === 'gradient';

  return (
    <Modal header="Fill Style">
      <div className="fill-style-settings__body">
        <RetroFieldset legend="Fill">
          <RetroToggle
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'gradient', label: 'Gradient' },
            ]}
            value={state.fillStyle.mode}
            onChange={(value): void => actions.fillStyle.setMode(value as FillMode)}
          />
        </RetroFieldset>
        <RetroFieldset legend="Gradient Direction" className="fill-style-settings__axis">
          <RetroToggle
            variant="column"
            options={AXIS_OPTIONS}
            value={state.fillStyle.axis}
            onChange={(value): void => actions.fillStyle.setAxis(value as GradientAxis)}
            disabled={!isGradient}
          />
        </RetroFieldset>
        <RetroFieldset legend="Range" className="fill-style-settings__range">
          {rangeOptions.length > 0 ? (
            <RetroToggle
              options={rangeOptions}
              value={String(state.fillStyle.rangeIndex)}
              onChange={(value): void =>
                actions.fillStyle.setRangeIndex(Number(value) as 0 | 1 | 2 | 3)
              }
              disabled={!isGradient}
            />
          ) : (
            <span className="fill-style-settings__hint">
              No ranges defined — set one in the palette editor (Range panel).
            </span>
          )}
        </RetroFieldset>
        <RetroFieldset legend="Dither" className="fill-style-settings__dither">
          <RetroLabeledSlider
            label=""
            value={Math.round(state.fillStyle.dither * 100)}
            min={0}
            max={100}
            onChange={(value): void => actions.fillStyle.setDither(value / 100)}
          />
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
