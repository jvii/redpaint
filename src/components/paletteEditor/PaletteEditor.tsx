import { JSX } from 'react';
import './PaletteEditor.css';
import { useActions, useAppState } from '../../overmind';
import { Color } from '../../types';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { colorToRGBString, rgbToHsv, hsvToRgb } from '../../tools/util/util';
import Palette from '../palette/Palette';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroFieldset } from '../ui/RetroFieldset';
import { RetroLabeledSlider } from '../ui/RetroLabeledSlider';
import { RetroToggle } from '../ui/RetroToggle';
import { rateToStepsPerSecond, stepsPerSecondToRate } from '../../algorithm/cycle';

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

  function handleSelectColor(colorId: string): void {
    const armed = state.paletteEditor.armedAction;
    actions.paletteEditor.selectEditedColor(colorId);
    // a completed copy/swap/spread recolored palette slots: refresh the GL
    // palettes (range endpoint picks don't change colors)
    if (armed === 'copy' || armed === 'swap' || armed === 'spread') {
      paintingCanvasController.updatePalette();
      overlayCanvasController.updatePalette();
    }
  }

  const activeRangeIndex = state.paletteEditor.activeRangeIndex;
  const activeRange = activeRangeIndex !== null ? state.palette.ranges[activeRangeIndex] : null;
  const rangeOptions = state.palette.ranges.map((_, index) => ({
    value: String(index),
    label: String(index + 1),
  }));

  return (
    <Modal header="Color palette" width={600}>
      <div className="palette-editor__container">
        {/* DPaint's Palette Window layout: sliders on the left, swatch grid
            on the right */}
        <div className="palette-editor__sliders">
          <div className="palette-editor__slider-group">
            <RetroLabeledSlider
              label="R"
              value={editedColor.r}
              min={0}
              max={255}
              onChange={(value): void => setColor({ ...editedColor, r: value })}
            />
            <RetroLabeledSlider
              label="G"
              value={editedColor.g}
              min={0}
              max={255}
              onChange={(value): void => setColor({ ...editedColor, g: value })}
            />
            <RetroLabeledSlider
              label="B"
              value={editedColor.b}
              min={0}
              max={255}
              onChange={(value): void => setColor({ ...editedColor, b: value })}
            />
          </div>
          <div className="palette-editor__slider-divider"></div>
          <div className="palette-editor__slider-group">
            <RetroLabeledSlider
              label="H"
              value={hsv.h}
              min={0}
              max={359}
              onChange={(value): void => setHsv({ ...hsv, h: value })}
            />
            <RetroLabeledSlider
              label="S"
              value={hsv.s}
              min={0}
              max={100}
              onChange={(value): void => setHsv({ ...hsv, s: value })}
            />
            <RetroLabeledSlider
              label="V"
              value={hsv.v}
              min={0}
              max={100}
              onChange={(value): void => setHsv({ ...hsv, v: value })}
            />
          </div>
        </div>
        <div className="palette-editor__palette-container">
          <Palette
            selectedColorId={state.paletteEditor.editedColorId}
            onSelectColor={handleSelectColor}
            activeRange={activeRange}
            columnDividers
          />
          {/* armed action's instruction: a callout pointing at the palette
              grid, where the next click belongs; overflows the requester */}
          {state.paletteEditor.armedAction && (
            <span className="palette-editor__callout">
              {state.paletteEditor.armedAction === 'copy' && 'Select the color to copy to'}
              {state.paletteEditor.armedAction === 'swap' && 'Select the color to swap with'}
              {state.paletteEditor.armedAction === 'spread' &&
                'Select the last color of the spread'}
              {state.paletteEditor.armedAction === 'range' && 'Select the last color of the range'}
            </span>
          )}
        </div>
      </div>

      {/* DPaint's Spread, Ex(change) and Copy: two-color actions — arm,
          then click the second color. The armed button becomes its own
          cancel. */}
      <RetroFieldset legend="Edit colors" bordered className="palette-editor__edit-colors">
        <div className="palette-editor__actions">
          {/* DPaint's order: Spread first, then the slot-surgery pair */}
          <RetroButton
            variant={state.paletteEditor.armedAction === 'spread' ? 'secondary' : 'basic'}
            onClick={(): void => actions.paletteEditor.armAction('spread')}
          >
            {state.paletteEditor.armedAction === 'spread' ? 'Cancel spread' : 'Spread'}
          </RetroButton>
          <span className="palette-editor__action-group">
            <RetroButton
              variant={state.paletteEditor.armedAction === 'swap' ? 'secondary' : 'basic'}
              onClick={(): void => actions.paletteEditor.armAction('swap')}
            >
              {state.paletteEditor.armedAction === 'swap' ? 'Cancel swap' : 'Swap'}
            </RetroButton>
            <RetroButton
              variant={state.paletteEditor.armedAction === 'copy' ? 'secondary' : 'basic'}
              onClick={(): void => actions.paletteEditor.armAction('copy')}
            >
              {state.paletteEditor.armedAction === 'copy' ? 'Cancel copy' : 'Copy'}
            </RetroButton>
          </span>
        </div>
      </RetroFieldset>

      <RetroFieldset legend="Range" bordered className="palette-editor__ranges">
        <RetroToggle
          options={rangeOptions}
          value={activeRangeIndex !== null ? String(activeRangeIndex) : ''}
          onChange={(value): void => actions.paletteEditor.selectRange(Number(value))}
        />

        {/* DPaint's RANGE flow: the selected color is the range's first
            color, the next palette click its last */}
        <div className="palette-editor__range-row">
          <span className="palette-editor__range-endpoints">
            <RetroButton
              variant={state.paletteEditor.armedAction === 'range' ? 'secondary' : 'basic'}
              disabled={activeRangeIndex === null}
              onClick={(): void => actions.paletteEditor.armAction('range')}
            >
              {state.paletteEditor.armedAction === 'range' ? 'Cancel set' : 'Set range'}
            </RetroButton>
            {activeRange && (
              <>
                <span
                  className="palette-editor__range-swatch"
                  style={{
                    backgroundColor: colorToRGBString(state.palette.palette[activeRange.start]),
                  }}
                ></span>
                <span className="palette-editor__range-arrow"></span>
                <span
                  className="palette-editor__range-swatch"
                  style={{
                    backgroundColor: colorToRGBString(state.palette.palette[activeRange.end]),
                  }}
                ></span>
              </>
            )}
          </span>
          <span className="palette-editor__range-clear">
            <RetroButton
              variant="secondary"
              // nothing to clear until the active range has endpoints set
              disabled={!activeRange}
              onClick={actions.paletteEditor.clearActiveRange}
            >
              Clear
            </RetroButton>
          </span>
        </div>

        {/* Cycling settings ride on the selected range slot: speed shown in
            steps/second (stored as raw CRNG units for lossless IFF
            round-trip), plus DPaint's active and direction flags. Speed gets
            its own row — a horizontal slider needs the width, or its track
            is too cramped to drag precisely. Active and direction (as
            up/down arrows: forward walks start->end, reverse the opposite)
            share the second row. */}
        <div className="palette-editor__range-cycling">
          <RetroLabeledSlider
            label="Speed"
            vertical={false}
            value={activeRange ? Math.round(rateToStepsPerSecond(activeRange.rate)) : 0}
            min={0}
            max={60}
            disabled={!activeRange}
            onChange={(value): void => {
              if (activeRangeIndex !== null) {
                actions.palette.setRangeSettings({
                  rangeIndex: activeRangeIndex,
                  rate: stepsPerSecondToRate(value),
                });
              }
            }}
          />
          <div className="palette-editor__range-cycling-toggles">
            <RetroToggle
              options={[
                { value: 'on', label: 'Cycle' },
                { value: 'off', label: 'Off' },
              ]}
              value={activeRange?.active ? 'on' : 'off'}
              disabled={!activeRange}
              onChange={(value): void => {
                if (activeRangeIndex !== null) {
                  actions.palette.setRangeSettings({
                    rangeIndex: activeRangeIndex,
                    active: value === 'on',
                  });
                }
              }}
            />
            <RetroToggle
              options={[
                { value: 'forward', label: '↓' },
                { value: 'reverse', label: '↑' },
              ]}
              value={activeRange?.reverse ? 'reverse' : 'forward'}
              disabled={!activeRange}
              onChange={(value): void => {
                if (activeRangeIndex !== null) {
                  actions.palette.setRangeSettings({
                    rangeIndex: activeRangeIndex,
                    reverse: value === 'reverse',
                  });
                }
              }}
            />
          </div>
        </div>
      </RetroFieldset>

      <RetroButton variant="secondary" onClick={handleCancel}>
        Cancel
      </RetroButton>
      <RetroButton variant="primary" onClick={actions.paletteEditor.close}>
        OK
      </RetroButton>
    </Modal>
  );
}
