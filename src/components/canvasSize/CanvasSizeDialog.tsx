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
import { CanvasAnchor } from '../../domain/CanvasColorIndex';

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

// The 3x3 anchor grid, row-major from the top-left. Each cell is a fraction of
// the size difference per axis, so the same control means "which corner stays
// put" when cropping and "where the artwork sits" when growing.
const ANCHORS: { anchor: CanvasAnchor; title: string }[] = [
  { anchor: { x: 0, y: 0 }, title: 'Top left' },
  { anchor: { x: 0.5, y: 0 }, title: 'Top' },
  { anchor: { x: 1, y: 0 }, title: 'Top right' },
  { anchor: { x: 0, y: 0.5 }, title: 'Left' },
  { anchor: { x: 0.5, y: 0.5 }, title: 'Center' },
  { anchor: { x: 1, y: 0.5 }, title: 'Right' },
  { anchor: { x: 0, y: 1 }, title: 'Bottom left' },
  { anchor: { x: 0.5, y: 1 }, title: 'Bottom' },
  { anchor: { x: 1, y: 1 }, title: 'Bottom right' },
];

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
  // top-left by default: DPaint's behaviour, and what every resize did before
  // this control existed
  const [anchorIndex, setAnchorIndex] = useState(0);
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
    actions.canvas.resizeCanvasPlacingContent({ ...target, anchor: ANCHORS[anchorIndex].anchor });
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
        {/* Which part of the picture survives a crop, and where it sits inside
            a growth — the same question either way, so one control answers
            both. Dots rather than words: the grid's own shape says where each
            cell is, and nine text labels would say it nine times over.
            Deliberately not disabled while the size is unchanged: choosing the
            anchor before typing the size is the natural order, and a control
            that silently ignores the first half of that is worse than one that
            is briefly a no-op. */}
        <RetroFieldset legend="Anchor" className="canvas-size__anchor">
          <RetroToggle
            variant="grid"
            columns={3}
            options={ANCHORS.map((entry, index) => ({
              value: String(index),
              label: <span className="canvas-size__anchor-dot" />,
              title: entry.title,
            }))}
            value={String(anchorIndex)}
            onChange={(value): void => setAnchorIndex(Number(value))}
          />
        </RetroFieldset>
        {/* Both notes state a consequence rather than asking for confirmation:
            the change is one Ctrl+Z away, and undo carries the canvas size
            back with the pixels. */}
        {wouldCrop && (
          <p className="canvas-size__note">
            Smaller than the current canvas — pixels outside the new size are cropped from{' '}
            {croppedFrom(ANCHORS[anchorIndex].anchor)}. Undo puts them back.
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

// Names the edges a crop actually takes from, which is the opposite of the
// anchored one: anchoring the top-left crops the right and bottom.
function croppedFrom(anchor: CanvasAnchor): string {
  if (anchor.x === 0.5 && anchor.y === 0.5) {
    return 'all four sides';
  }
  const horizontal = anchor.x === 0 ? 'the right' : anchor.x === 1 ? 'the left' : 'both sides';
  const vertical = anchor.y === 0 ? 'bottom' : anchor.y === 1 ? 'top' : 'top and bottom';
  return `${horizontal} and ${vertical}`;
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) {
    return NaN;
  }
  return Math.min(MAX_SIDE, Math.max(MIN_SIDE, Math.trunc(value)));
}
