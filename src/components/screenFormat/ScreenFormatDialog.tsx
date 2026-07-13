import { JSX, useState } from 'react';
import './ScreenFormatDialog.css';
import { useActions, useAppState } from '../../overmind';
import { ScreenFormatId, screenFormats } from '../../overmind/canvas/state';
import { PaletteSource } from '../../overmind/canvas/actions';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroToggle } from '../ui/RetroToggle';
import { RetroFieldset } from '../ui/RetroFieldset';

// 'Native' is the no-simulation state (screenFormatId === null): the
// page is shown 1:1 in the window, no Amiga screen scaling — the startup mode.
const NATIVE = 'native';
type FormatChoice = ScreenFormatId | typeof NATIVE;

const FORMAT_OPTIONS = [
  { value: NATIVE, label: 'Native' },
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
  // Whether the document allows true-color pixels. Switching it off (with OK)
  // conforms the canvas to the palette — the explicit color-reducing move.
  const [trueColorEnabled, setTrueColorEnabled] = useState(state.canvas.trueColorEnabled);
  // Where a reduction takes its palette from (see PaletteSource). Only
  // meaningful when the draft actually reduces colors, so the toggle below is
  // disabled otherwise.
  const [paletteSource, setPaletteSource] = useState<PaletteSource>('current');
  const reducesColors =
    colors < state.palette.paletteArray.length ||
    (!trueColorEnabled && state.canvas.hasTrueColorPixels);

  const handleOk = (): void => {
    const resolvedFormatId = isNative ? null : formatId;

    // Native has no page size, so it keeps the current canvas as-is (shown 1:1).
    if (isNative) {
      const conformed = actions.canvas.applyScreenFormat({
        formatId: null,
        colors,
        trueColorEnabled,
        paletteSource,
      });
      if (conformed) {
        actions.undo.setUndoPoint();
      }
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
        colors,
        trueColorEnabled,
        paletteSource,
        target,
      });
      actions.dialog.open('SCREEN_RESIZE');
      return;
    }

    const conformed = actions.canvas.applyScreenFormat({
      formatId: resolvedFormatId,
      colors,
      trueColorEnabled,
      paletteSource,
    });
    if (!sameSize) {
      // one history entry for the whole change, via the resize upload — which
      // picks up the conformed pixels, if any
      actions.canvas.resizeCanvasPlacingContent(target);
    } else if (conformed) {
      actions.undo.setUndoPoint();
    }
    actions.dialog.close();
  };

  return (
    <Modal header="Screen Format" width={840}>
      <div className="screen-format__body">
        <RetroFieldset legend="Resolution" className="screen-format__formats">
          <RetroToggle
            variant="column"
            options={FORMAT_OPTIONS}
            value={formatId}
            onChange={(value): void => setFormatId(value as FormatChoice)}
          />
        </RetroFieldset>
        <div className="screen-format__right">
          <RetroFieldset legend="Indexed palette size" className="screen-format__colors">
            <RetroToggle
              variant="grid"
              columns={4}
              options={COLOR_OPTIONS}
              value={String(colors)}
              onChange={(value): void => setColors(Number(value))}
            />
          </RetroFieldset>
          <RetroFieldset legend="True Color" className="screen-format__truecolor">
            {/* off conforms the canvas to the palette on OK (flattening any
                true-color pixels); loading an image as True Color re-enables */}
            <RetroToggle
              variant="grid"
              columns={2}
              options={[
                { value: 'on', label: 'On' },
                { value: 'off', label: 'Off' },
              ]}
              value={trueColorEnabled ? 'on' : 'off'}
              onChange={(value): void => setTrueColorEnabled(value === 'on')}
            />
          </RetroFieldset>
          <RetroFieldset legend="Remap to" className="screen-format__remap">
            {/* only a reduction remaps: fewer colors, or True Color going off.
                The count is the target size — both options produce it */}
            <RetroToggle
              variant="column"
              options={[
                { value: 'current', label: `Current palette (${colors})` },
                { value: 'image', label: 'New palette from image' },
              ]}
              value={paletteSource}
              onChange={(value): void => setPaletteSource(value as PaletteSource)}
              disabled={!reducesColors}
            />
          </RetroFieldset>
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
