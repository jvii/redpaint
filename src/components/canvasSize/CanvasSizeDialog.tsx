import { JSX, useState } from 'react';
import './CanvasSizeDialog.css';
import { useActions, useAppState } from '../../overmind';
import { resolveScreenFormat } from '../../overmind/canvas/state';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroToggle } from '../ui/RetroToggle';
import { RetroFieldset } from '../ui/RetroFieldset';
import { RetroInputField } from '../ui/RetroInputField';

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

type SizeChoice = 'fit' | 'custom';

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
  // The size that fills the display, whatever the display currently is: a
  // simulated screen's own dimensions, or — at Native, where no screen is
  // being simulated — the drawing pane itself, which is what the app sizes
  // the canvas to at startup anyway. Naming both cases in one slot means the
  // option is never the greyed-out dead weight it was at Native.
  const screen = state.canvas.screenFormatId
    ? resolveScreenFormat(state.canvas.screenFormatId, state.canvas.videoStandard)
    : null;
  const viewport = state.canvas.viewportSize;
  const fit = screen
    ? { label: 'Screen Size', width: screen.width, height: screen.height }
    : viewport.width > 0 && viewport.height > 0
      ? { label: 'Window Size', width: viewport.width, height: viewport.height }
      : null;

  const [choice, setChoice] = useState<SizeChoice>('custom');
  const [width, setWidth] = useState(String(current.width));
  const [height, setHeight] = useState(String(current.height));

  const target =
    choice === 'fit' && fit
      ? { width: fit.width, height: fit.height }
      : {
          width: clamp(Number.parseInt(width, 10)),
          height: clamp(Number.parseInt(height, 10)),
        };

  const valid = Number.isFinite(target.width) && Number.isFinite(target.height);
  const unchanged = valid && target.width === current.width && target.height === current.height;
  // Always something, never nothing: the note's space is reserved either way
  // (see CanvasSizeDialog.css), so an empty one is a hole rather than a saving,
  // and both of these states are worth a word — one explains a disabled OK,
  // the other confirms that OK would do nothing.
  const note = valid ? resizeNote(current, target) : 'Enter a width and a height.';

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
          <b>
            {current.width}×{current.height}
          </b>
        </div>
        <RetroFieldset legend="Select New Size">
          <RetroToggle
            variant="column"
            options={[
              {
                value: 'fit',
                label: fit ? `${fit.label} (${fit.width}\u00d7${fit.height})` : 'Screen Size',
                disabled: !fit,
              },
              { value: 'custom', label: 'Custom Size' },
            ]}
            value={choice}
            onChange={(value): void => setChoice(value as SizeChoice)}
          />
          <div className="canvas-size__fields">
            <RetroInputField
              label="Width:"
              value={choice === 'fit' && fit ? String(fit.width) : width}
              onChange={setWidth}
              disabled={choice === 'fit'}
              numeric
            />
            <RetroInputField
              label="Height:"
              value={choice === 'fit' && fit ? String(fit.height) : height}
              onChange={setHeight}
              disabled={choice === 'fit'}
              numeric
            />
          </div>
        </RetroFieldset>
        {/* What the change does to the picture — stated as a consequence
            rather than as a question, since it is one Ctrl+Z away and undo
            carries the canvas size back with the pixels. */}
        <p className="canvas-size__note">{note}</p>
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

// What the resize will do to the picture, in one sentence.
//
// Written per edge rather than per direction, because a change can crop one
// axis while growing the other — and "smaller than the current canvas" and
// "larger than the current canvas" cannot both be true of the same canvas.
// Only a change that goes one way throughout gets to make that overall claim;
// a mixed one simply names what happens at each edge.
function resizeNote(
  current: { width: number; height: number },
  target: { width: number; height: number }
): string {
  const cropped = [
    target.width < current.width ? 'right' : null,
    target.height < current.height ? 'bottom' : null,
  ].filter(Boolean);
  const grown = [
    target.width > current.width ? 'right' : null,
    target.height > current.height ? 'bottom' : null,
  ].filter(Boolean);
  if (!cropped.length && !grown.length) {
    return 'The same size as the current canvas — nothing to change.';
  }

  const edges = (list: (string | null)[]): string => list.join(' and ');
  const cropClause = `pixels are cropped from the ${edges(cropped)}`;
  const newSpace = `the new space at the ${edges(grown)} is filled with the background color`;

  if (!grown.length) {
    return `Smaller than the current canvas — ${cropClause}.`;
  }
  if (!cropped.length) {
    // worth saying only here: when nothing is cropped, "larger" could be read
    // as the picture being scaled up to fit, which is the one thing this
    // requester never does
    return `Larger than the current canvas — the picture keeps its place, and ${newSpace}.`;
  }
  return `${capitalize(cropClause)}, and ${newSpace}.`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) {
    return NaN;
  }
  return Math.min(MAX_SIDE, Math.max(MIN_SIDE, Math.trunc(value)));
}
