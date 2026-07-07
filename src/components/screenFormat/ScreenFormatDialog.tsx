import { JSX, useState } from 'react';
import './ScreenFormatDialog.css';
import { useActions, useAppState } from '../../overmind';
import { ScaleMode, ScreenFormatId, screenFormats } from '../../overmind/canvas/state';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroToggle } from '../ui/RetroToggle';

// 'Native pixels' is the no-simulation state (screenFormatId === null): the
// page is shown 1:1 in the window, no Amiga screen scaling — the startup mode.
const NATIVE = 'native';
type FormatChoice = ScreenFormatId | typeof NATIVE;

const FORMAT_OPTIONS = [
  { value: NATIVE, label: 'Native pixels' },
  ...Object.values(screenFormats).map((format) => ({
    value: format.id,
    // name on the left, resolution right-aligned on the same row (the segment
    // is laid out as a flex row in CSS)
    label: (
      <>
        <span className="screen-format__format-name">{format.name}</span>
        <span className="screen-format__format-res">
          {format.width}x{format.height}
        </span>
      </>
    ),
  })),
];

// DPaint II offered 2..32 (the Amiga's bitplane depths); 64/128/256 are ours
const COLOR_OPTIONS = [2, 4, 8, 16, 32, 64, 128, 256].map((colors) => ({
  value: String(colors),
  label: String(colors),
}));

export function ScreenFormatDialog(): JSX.Element | null {
  const state = useAppState();

  if (state.dialog.activeDialog !== 'SCREEN_FORMAT') {
    return null;
  }
  // remounts on every open, so the draft state below starts fresh each time
  return <ScreenFormatDialogOpen />;
}

function ScreenFormatDialogOpen(): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  // Draft selections, applied only on OK (Cancel changes nothing).
  const [formatId, setFormatId] = useState<FormatChoice>(
    state.canvas.screenFormatId ?? NATIVE
  );
  const isNative = formatId === NATIVE;
  const [colors, setColors] = useState(
    COLOR_OPTIONS.some((option) => Number(option.value) === state.palette.paletteArray.length)
      ? state.palette.paletteArray.length
      : 32
  );
  // What happens to the canvas (the pixel bitmap): resize it to one screenful,
  // or leave it as it is under the new screen. TODO: resizing currently clears
  // the canvas — a proper resize/remap of existing pixels is still to come.
  const [canvasMode, setCanvasMode] = useState<'screen' | 'keep'>('screen');
  // How the screen is scaled to the window: uniform whole pixels with margin,
  // or a fractional stretch that fills the window (see ScaleMode).
  const [scaleMode, setScaleMode] = useState<ScaleMode>(state.canvas.scaleMode);

  const handleOk = (): void => {
    const resolvedFormatId = isNative ? null : formatId;
    actions.palette.setNumberOfColors(colors);
    actions.canvas.setScreenFormat({
      formatId: resolvedFormatId,
      scaleMode,
      resizeCanvasToScreen: canvasMode === 'screen',
    });
    // Native has no fixed screen size, so "Resize to screen" means fill the
    // window at 1:1 (the startup default). setScreenFormat skips its own resize
    // for a null format, so size the canvas to the live viewport here instead.
    if (resolvedFormatId === null && canvasMode === 'screen') {
      const div = document.querySelector('.main-canvas-div');
      if (div instanceof HTMLElement) {
        actions.canvas.setResolution({ width: div.offsetWidth, height: div.offsetHeight });
      }
    }
    // the GL palette textures don't watch Overmind — push the resized palette
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();
    actions.dialog.close();
  };

  return (
    <Modal header="Screen Format" width={840}>
      <div className="screen-format__body">
        <fieldset className="screen-format__formats">
          <legend>Resolution</legend>
          <RetroToggle
            variant="column"
            options={FORMAT_OPTIONS}
            value={formatId}
            onChange={(value): void => setFormatId(value as FormatChoice)}
          />
        </fieldset>
        <div className="screen-format__right">
          <fieldset className="screen-format__colors">
            <legend>Number of Colors</legend>
            <RetroToggle
              variant="grid"
              columns={4}
              options={COLOR_OPTIONS}
              value={String(colors)}
              onChange={(value): void => setColors(Number(value))}
            />
          </fieldset>
          <fieldset className="screen-format__canvas">
            <legend>Canvas</legend>
            <RetroToggle
              variant="column"
              options={[
                { value: 'screen', label: 'Resize to screen' },
                { value: 'keep', label: 'Keep canvas' },
              ]}
              value={canvasMode}
              onChange={(value): void => setCanvasMode(value as 'screen' | 'keep')}
            />
          </fieldset>
          <fieldset className="screen-format__scaling">
            <legend>Scaling</legend>
            {/* scaling only affects a simulated screen; native pixels are 1:1 */}
            <RetroToggle
              variant="grid"
              columns={2}
              options={[
                { value: 'integer', label: 'Integer' },
                { value: 'stretch', label: 'Stretch' },
              ]}
              value={scaleMode}
              onChange={(value): void => setScaleMode(value as ScaleMode)}
              disabled={isNative}
            />
          </fieldset>
        </div>
      </div>
      <RetroButton variant="secondary" onClick={actions.dialog.close}>
        Cancel
      </RetroButton>
      <RetroButton variant="primary" onClick={handleOk}>
        OK
      </RetroButton>
    </Modal>
  );
}
