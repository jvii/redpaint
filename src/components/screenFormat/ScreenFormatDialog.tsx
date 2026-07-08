import { JSX, useState } from 'react';
import './ScreenFormatDialog.css';
import { useActions, useAppState } from '../../overmind';
import { ScaleMode, ScreenFormatId, screenFormats } from '../../overmind/canvas/state';
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
  // How the screen is scaled to the window: uniform whole pixels with margin,
  // or a fractional stretch that fills the window (see ScaleMode).
  const [scaleMode, setScaleMode] = useState<ScaleMode>(state.canvas.scaleMode);

  const handleOk = (): void => {
    const resolvedFormatId = isNative ? null : formatId;

    // Native has no page size, so it keeps the current canvas as-is (shown 1:1).
    if (isNative) {
      actions.canvas.applyScreenFormat({ formatId: null, scaleMode, colors });
      actions.dialog.close();
      return;
    }

    // An Amiga format fits the canvas to its dimensions. Growing (or an equal
    // size) anchors the existing pixels top-left at 1:1 — nothing is lost, so
    // commit straight away. Shrinking in either dimension would crop, so hold
    // the *whole* change unapplied and ask; that way Cancel undoes nothing
    // (reverting a narrowed palette would lose the dropped colors for good).
    const format = screenFormats[formatId as ScreenFormatId];
    const target = { width: format.width, height: format.height };
    const current = state.canvas.resolution;
    const sameSize = target.width === current.width && target.height === current.height;
    const wouldShrink = target.width < current.width || target.height < current.height;

    if (wouldShrink) {
      actions.canvas.setPendingScreenFormat({
        formatId: resolvedFormatId,
        scaleMode,
        colors,
        target,
      });
      actions.dialog.open('SCREEN_RESIZE');
      return;
    }

    actions.canvas.applyScreenFormat({ formatId: resolvedFormatId, scaleMode, colors });
    if (!sameSize) {
      actions.canvas.resizeCanvasPlacingContent(target);
    }
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
          <fieldset className="screen-format__scaling">
            <legend>View scaling</legend>
            {/* view scaling only applies to a simulated screen; native is 1:1 */}
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
