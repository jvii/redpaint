import { JSX, useState } from 'react';
import './ScreenFormatDialog.css';
import { useActions, useAppState } from '../../overmind';
import { ScaleMode, ScreenFormatId, screenFormats } from '../../overmind/canvas/state';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroToggle } from '../ui/RetroToggle';

const FORMAT_OPTIONS = Object.values(screenFormats).map((format) => ({
  value: format.id,
  label: `${format.name} ${format.width}x${format.height}`,
}));

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
  const [formatId, setFormatId] = useState<ScreenFormatId>(state.canvas.screenFormatId ?? 'loRes');
  const [colors, setColors] = useState(
    COLOR_OPTIONS.some((option) => Number(option.value) === state.palette.paletteArray.length)
      ? state.palette.paletteArray.length
      : 32
  );
  // DPaint's page choice: resize the page to one screenful (clears the
  // drawing for now) or keep the current page under the new screen
  const [pageMode, setPageMode] = useState<'screen' | 'keep'>('screen');
  // How the screen is scaled to the window: uniform whole pixels with margin,
  // or a fractional stretch that fills the window (see ScaleMode).
  const [scaleMode, setScaleMode] = useState<ScaleMode>(state.canvas.scaleMode);

  const handleOk = (): void => {
    actions.palette.setNumberOfColors(colors);
    actions.canvas.setScreenFormat({
      formatId,
      scaleMode,
      resizePageToScreen: pageMode === 'screen',
    });
    // the GL palette textures don't watch Overmind — push the resized palette
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();
    actions.dialog.close();
  };

  return (
    <Modal header="Choose Screen Format" width={620}>
      <div className="screen-format__body">
        <fieldset className="screen-format__formats">
          <legend>Format</legend>
          <RetroToggle
            options={FORMAT_OPTIONS}
            value={formatId}
            onChange={(value): void => setFormatId(value as ScreenFormatId)}
          />
        </fieldset>
        <div className="screen-format__right">
          <fieldset className="screen-format__colors">
            <legend>Number of Colors</legend>
            <RetroToggle
              options={COLOR_OPTIONS}
              value={String(colors)}
              onChange={(value): void => setColors(Number(value))}
            />
          </fieldset>
          <fieldset className="screen-format__page">
            <legend>Page</legend>
            <RetroToggle
              options={[
                { value: 'screen', label: 'Screen Size Page' },
                { value: 'keep', label: 'Keep Same Page' },
              ]}
              value={pageMode}
              onChange={(value): void => setPageMode(value as 'screen' | 'keep')}
            />
          </fieldset>
          <fieldset className="screen-format__scaling">
            <legend>Scaling</legend>
            <RetroToggle
              options={[
                { value: 'integer', label: 'Integer' },
                { value: 'stretch', label: 'Stretch' },
              ]}
              value={scaleMode}
              onChange={(value): void => setScaleMode(value as ScaleMode)}
            />
          </fieldset>
        </div>
      </div>
      <hr className="retro-divider" />
      <RetroButton variant="secondary" onClick={actions.dialog.close}>
        Cancel
      </RetroButton>
      <RetroButton variant="primary" onClick={handleOk}>
        OK
      </RetroButton>
    </Modal>
  );
}
