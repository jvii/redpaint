import { JSX, useEffect, useState } from 'react';
import './PaletteEditor.css';
import { useActions, useAppState } from '../../overmind';
import { Color } from '../../types';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { colorToRGBString, rgbToHsv, hsvToRgb } from '../../tools/util/util';
import Palette from '../palette/Palette';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroSlider } from '../ui/RetroSlider';
import { RetroToggle } from '../ui/RetroToggle';

const RANGE_OPTIONS = [
  { value: '0', label: '1' },
  { value: '1', label: '2' },
  { value: '2', label: '3' },
  { value: '3', label: '4' },
];

type SliderFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

// Vertical slider with its label above and a directly-editable numeric
// readout below. The readout keeps its own text buffer so a value can be
// typed freely (including transiently invalid/empty states) and is only
// clamped and committed on blur/Enter.
function SliderField({ label, value, min, max, onChange }: SliderFieldProps): JSX.Element {
  const [text, setText] = useState(String(value));

  useEffect((): void => {
    setText(String(value));
  }, [value]);

  function commit(): void {
    const parsed = Math.round(Number(text));
    if (Number.isNaN(parsed)) {
      setText(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    setText(String(clamped));
    if (clamped !== value) {
      onChange(clamped);
    }
  }

  return (
    <div className="palette-editor__slider">
      <span className="palette-editor__slider-label">{label}</span>
      <div className="palette-editor__slider-track">
        <RetroSlider vertical value={value} min={min} max={max} onChange={onChange} />
      </div>
      <input
        className="palette-editor__slider-input"
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(event): void => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event): void => {
          if (event.key === 'Enter') {
            (event.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}

export function PaletteEditor(): JSX.Element | null {
  const state = useAppState();
  const actions = useActions();

  if (!state.paletteEditor.isOpen) {
    return null;
  }

  // The editor edits its own selected slot, independent of the painting
  // foreground/background color (see overmind/paletteEditor).
  const editedColor = state.palette.palette[state.paletteEditor.editedColorId];
  const hsv = rgbToHsv(editedColor);

  function setColor(newColor: Color): void {
    actions.palette.editColor({
      colorId: state.paletteEditor.editedColorId,
      newColor,
    });
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();
  }

  function setHsv(newHsv: { h: number; s: number; v: number }): void {
    setColor(hsvToRgb(newHsv));
  }

  function handleCancel(): void {
    actions.paletteEditor.cancel();
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();
  }

  const activeRangeIndex = state.paletteEditor.activeRangeIndex;
  const activeRange = activeRangeIndex !== null ? state.palette.ranges[activeRangeIndex] : null;
  const armedEndpoint = state.paletteEditor.armedEndpoint;

  return (
    <Modal header="Color palette" width={680}>
      <div className="palette-editor__container">
        <div className="palette-editor__palette-container">
          <Palette
            selectedColorId={state.paletteEditor.editedColorId}
            onSelectColor={(colorId): void => actions.paletteEditor.selectEditedColor(colorId)}
            activeRange={activeRange}
            columnDividers
          />
        </div>
        <div className="palette-editor__sliders">
          <div className="palette-editor__slider-group">
            <SliderField
              label="R"
              value={editedColor.r}
              min={0}
              max={255}
              onChange={(value): void => setColor({ ...editedColor, r: value })}
            />
            <SliderField
              label="G"
              value={editedColor.g}
              min={0}
              max={255}
              onChange={(value): void => setColor({ ...editedColor, g: value })}
            />
            <SliderField
              label="B"
              value={editedColor.b}
              min={0}
              max={255}
              onChange={(value): void => setColor({ ...editedColor, b: value })}
            />
          </div>
          <div className="palette-editor__slider-divider"></div>
          <div className="palette-editor__slider-group">
            <SliderField
              label="H"
              value={hsv.h}
              min={0}
              max={359}
              onChange={(value): void => setHsv({ ...hsv, h: value })}
            />
            <SliderField
              label="S"
              value={hsv.s}
              min={0}
              max={100}
              onChange={(value): void => setHsv({ ...hsv, s: value })}
            />
            <SliderField
              label="V"
              value={hsv.v}
              min={0}
              max={100}
              onChange={(value): void => setHsv({ ...hsv, v: value })}
            />
          </div>
        </div>
      </div>

      <fieldset className="palette-editor__ranges">
        <legend>Range</legend>
        <RetroToggle
          options={RANGE_OPTIONS}
          value={activeRangeIndex !== null ? String(activeRangeIndex) : ''}
          onChange={(value): void => actions.paletteEditor.selectRange(Number(value))}
        />

        <span className="palette-editor__range-endpoints">
          <RetroButton
            variant={armedEndpoint === 'start' ? 'primary' : 'basic'}
            disabled={activeRangeIndex === null}
            onClick={(): void => actions.paletteEditor.armEndpoint('start')}
          >
            Set start
          </RetroButton>
          {activeRange && (
            <span
              className="palette-editor__range-swatch"
              style={{ backgroundColor: colorToRGBString(state.palette.palette[activeRange.start]) }}
            ></span>
          )}
          <RetroButton
            variant={armedEndpoint === 'end' ? 'primary' : 'basic'}
            disabled={activeRangeIndex === null}
            onClick={(): void => actions.paletteEditor.armEndpoint('end')}
          >
            Set end
          </RetroButton>
          {activeRange && (
            <span
              className="palette-editor__range-swatch"
              style={{ backgroundColor: colorToRGBString(state.palette.palette[activeRange.end]) }}
            ></span>
          )}
          <RetroButton disabled={activeRangeIndex === null} onClick={actions.paletteEditor.clearActiveRange}>
            Clear
          </RetroButton>
        </span>
        {armedEndpoint && (
          <span className="palette-editor__range-hint">Click a palette color to set it</span>
        )}
      </fieldset>

      <RetroButton variant="secondary" onClick={handleCancel}>
        Cancel
      </RetroButton>
      <RetroButton variant="primary" onClick={actions.paletteEditor.close}>
        OK
      </RetroButton>
    </Modal>
  );
}
