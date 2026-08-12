import { JSX, useState } from 'react';
import './CanvasSizeDialog.css';
import { useActions, useAppState } from '../../overmind';
import { resolveScreenFormat } from '../../overmind/canvas/state';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroToggle } from '../ui/RetroToggle';
import { RetroInputField } from '../ui/RetroInputField';

// DPaint calls this the page size, separate from the screen format: the format
// is the display being simulated, the page is the paper, and a page larger than
// the screen is a normal working style. This app's word for the paper is the
// canvas, which is what the status strip says.
//
// Never rescales: only grows or crops, pixels staying 1:1. Stretching a
// pixel-art painting is a destructive reinterpretation, not a side effect of
// setting how big the paper is. (The Screen Format requester does offer to
// scale, because fitting artwork to a newly chosen screen is a real want.)
const MIN_SIDE = 1;
// GL_MAX_TEXTURE_SIZE on anything we run on. Past this the canvas would not
// render at all, whatever the memory says.
const MAX_SIDE = 16384;
// The area limit, which is the one that actually bites: cost scales with pixel
// count, not with either side, so 16384x1 is nothing and 16384x16384 is a
// gigabyte per undo snapshot. 16 megapixels sits above the 12 MP benched as
// working-but-slow (docs/local/undo-memory.md) and well below where the tab
// stops surviving. It guards a slipped keystroke rather than a considered
// choice. Loading a photo larger than this is still allowed, with a word about
// what it will cost.
const MAX_PIXELS = 16_000_000;

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
  // simulated screen's own dimensions, or (at Native, where no screen is being
  // simulated) the drawing pane itself, which is what the app sizes the canvas
  // to at startup anyway. Naming both cases in one slot means the option is
  // never the greyed-out dead weight it was at Native.
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
      : { width: parseSide(width), height: parseSide(height) };

  const problem = sizeProblem(target);
  const valid = problem === null;
  const unchanged = valid && target.width === current.width && target.height === current.height;
  // Always something, never nothing: the note's space is reserved either way
  // (see CanvasSizeDialog.css), so an empty one is a hole rather than a saving,
  // and both of these states are worth a word. One explains a disabled OK, the
  // other confirms that OK would do nothing.
  const note = problem ?? resizeNote(current, target);

  const handleOk = (): void => {
    if (!valid || unchanged) {
      actions.dialog.close();
      return;
    }
    // Places the existing pixels 1:1 at the top-left, padding with the
    // background color and cropping whatever falls outside, and records its own
    // undo entry through the resize upload, so Ctrl+Z puts back both the pixels
    // and the old canvas size (useUndo restores a snapshot's own resolution).
    // That's why a crop needs no confirmation of its own.
    actions.canvas.resizeCanvasPlacingContent(target);
    actions.dialog.close();
  };

  return (
    <Modal header="Set Canvas Size" width={560}>
      <div className="canvas-size__body">
        <RetroToggle
          variant="column"
          options={[
            {
              value: 'fit',
              label: fit ? (
                <>
                  {fit.label}
                  <span className="canvas-size__option-res toggle-detail">
                    {fit.width}×{fit.height}
                  </span>
                </>
              ) : (
                'Screen Size'
              ),
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
            onChange={(value): void => setWidth(digitsOnly(value))}
            disabled={choice === 'fit'}
            numeric
          />
          <RetroInputField
            label="Height:"
            value={choice === 'fit' && fit ? String(fit.height) : height}
            onChange={(value): void => setHeight(digitsOnly(value))}
            disabled={choice === 'fit'}
            numeric
          />
        </div>
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
// axis while growing the other, and "smaller than the current canvas" and
// "larger than the current canvas" cannot both be true of the same canvas. Only
// a change that goes one way throughout gets to make that overall claim; a
// mixed one simply names what happens at each edge.
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

// Keeps the field to digits as it is typed, so a minus sign, a decimal point or
// a letter never reaches the value at all. There is no reading of "-5" or
// "12abc" worth guessing at.
//
// The leading run, not every digit in the string: deleting the non-digits from
// "12.5" would join what is left into 125, a paste that comes out ten times
// what was pasted, where truncating at the dot gives the 12 that was meant.
function digitsOnly(value: string): string {
  return (value.match(/^\d*/) ?? [''])[0];
}

function parseSide(value: string): number {
  return value === '' ? NaN : Number(value);
}

// What is wrong with the typed size, or null if nothing is. Returned as the
// message itself: the note is the only place this requester says anything, and
// OK stays disabled while there is one.
function sizeProblem(target: { width: number; height: number }): string | null {
  if (!Number.isFinite(target.width) || !Number.isFinite(target.height)) {
    return 'Enter a width and a height.';
  }
  if (target.width < MIN_SIDE || target.height < MIN_SIDE) {
    return `The canvas must be at least ${MIN_SIDE} pixel on each side.`;
  }
  if (target.width > MAX_SIDE || target.height > MAX_SIDE) {
    return `${MAX_SIDE} pixels is the most on any one side.`;
  }
  const megapixels = (target.width * target.height) / 1_000_000;
  if (target.width * target.height > MAX_PIXELS) {
    return `That is ${megapixels.toFixed(1)} megapixels — ${MAX_PIXELS / 1_000_000} is the most the canvas can be.`;
  }
  return null;
}
