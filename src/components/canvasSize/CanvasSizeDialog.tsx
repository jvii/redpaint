import { JSX, useState } from 'react';
import './CanvasSizeDialog.css';
import { useActions, useAppState } from '../../overmind';
import { resolveScreenFormat } from '../../overmind/canvas/state';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroToggle } from '../ui/RetroToggle';
import { RetroFieldset } from '../ui/RetroFieldset';
import { RetroInputField } from '../ui/RetroInputField';
import { undoLevelsForCanvas } from '../../overmind/undo/UndoBuffer';

// DPaint calls this the page size, on its own Pict menu item, deliberately
// separate from the screen format: the format is the display being simulated,
// the page is the paper you paint on, and a page larger than the screen is a
// normal working style (it scrolls). This app's own word for the paper is the
// canvas, which is what the status strip says, so that's the name here.
//
// The canvas is never rescaled by this requester — only grown or cropped, with
// the pixels staying 1:1. Stretching a pixel-art painting is a destructive
// reinterpretation of it, not a side effect anyone should get from setting how
// big the paper is. (The Screen Format requester does offer to scale, because
// fitting artwork to a newly chosen screen is a real want; this isn't that.)
const MIN_SIDE = 1;
const MAX_SIDE = 16384; // GL_MAX_TEXTURE_SIZE on anything we run on

type SizeChoice = 'screen' | 'custom';

export function CanvasSizeDialog(): JSX.Element | null {
  const state = useAppState();
  if (state.dialog.activeDialog !== 'CANVAS_SIZE') {
    return null;
  }
  // remounts on every open, so the draft state below starts from the live size
  return <CanvasSizeDialogOpen />;
}

function CanvasSizeDialogOpen(): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  const current = state.canvas.resolution;
  // Only a simulated screen has a size to snap to. At Native there is no
  // screen being simulated, so the option has nothing to mean and is offered
  // greyed out rather than hidden — a missing option reads as a bug, a
  // disabled one explains itself next to the format that would enable it.
  const screen = state.canvas.screenFormatId
    ? resolveScreenFormat(state.canvas.screenFormatId, state.canvas.videoStandard)
    : null;

  const [choice, setChoice] = useState<SizeChoice>('custom');
  const [width, setWidth] = useState(String(current.width));
  const [height, setHeight] = useState(String(current.height));

  const target =
    choice === 'screen' && screen
      ? { width: screen.width, height: screen.height }
      : {
          width: clamp(Number.parseInt(width, 10)),
          height: clamp(Number.parseInt(height, 10)),
        };

  const valid = Number.isFinite(target.width) && Number.isFinite(target.height);
  const unchanged = valid && target.width === current.width && target.height === current.height;
  const wouldCrop = valid && (target.width < current.width || target.height < current.height);
  const undoLevels = valid ? undoLevelsForCanvas(target.width, target.height) : 0;

  const handleOk = (): void => {
    if (!valid || unchanged) {
      actions.dialog.close();
      return;
    }
    // Places the existing pixels 1:1 at the top-left, padding with the
    // background color and cropping whatever falls outside — and records its
    // own undo entry through the resize upload, so Ctrl+Z puts back both the
    // pixels and the old canvas size (useUndo restores a snapshot's own
    // resolution). That's why a crop needs no confirmation of its own.
    actions.canvas.resizeCanvasPlacingContent(target);
    actions.dialog.close();
  };

  return (
    <Modal header="Canvas Size" width={560}>
      <div className="canvas-size__body">
        <div className="canvas-size__current">
          <span className="canvas-size__current-label">Current</span>
          {current.width}x{current.height}
        </div>
        <RetroFieldset legend="Size">
          <RetroToggle
            variant="column"
            options={[
              {
                value: 'screen',
                label: screen ? `Screen Size (${screen.width} x ${screen.height})` : 'Screen Size',
                disabled: !screen,
                title: screen ? undefined : 'No screen is simulated — the canvas is shown 1:1',
              },
              { value: 'custom', label: 'Custom Size' },
            ]}
            value={choice}
            onChange={(value): void => setChoice(value as SizeChoice)}
          />
          <div className="canvas-size__fields">
            <RetroInputField
              label="Width:"
              value={choice === 'screen' && screen ? String(screen.width) : width}
              onChange={setWidth}
              disabled={choice === 'screen'}
              numeric
            />
            <RetroInputField
              label="Height:"
              value={choice === 'screen' && screen ? String(screen.height) : height}
              onChange={setHeight}
              disabled={choice === 'screen'}
              numeric
            />
          </div>
        </RetroFieldset>
        {/* Both notes state a consequence rather than asking for confirmation:
            the change is one Ctrl+Z away, and undo carries the canvas size
            back with the pixels. */}
        {wouldCrop && (
          <p className="canvas-size__note">
            Smaller than the current canvas — pixels outside the new size are cropped from the right
            and bottom. Undo puts them back.
          </p>
        )}
        {valid && undoLevels < 25 && (
          <p className="canvas-size__note">
            {((target.width * target.height) / 1_000_000).toFixed(1)} megapixels. Painting will be
            slower at this size, and undo will hold about {undoLevels} steps.
          </p>
        )}
      </div>
      <RetroButton variant="secondary" onClick={(): void => actions.dialog.close()}>
        Cancel
      </RetroButton>
      <RetroButton variant="primary" onClick={handleOk} disabled={!valid}>
        OK
      </RetroButton>
    </Modal>
  );
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) {
    return NaN;
  }
  return Math.min(MAX_SIDE, Math.max(MIN_SIDE, Math.trunc(value)));
}
