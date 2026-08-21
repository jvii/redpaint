import { Context } from '../../overmind';
import { Mode, BuiltInBrushId, HandleMode, builtInBrushes, isBuiltInBrush } from './state';
import { usesColorizedBrush } from './mode';
import { CustomBrush } from '../../brush/CustomBrush';
import { createSizedBuiltInBrush } from '../../brush/BuiltInBrushFactory';
import { brushRecall } from '../../brush/BrushRecall';
import { brushSlots } from '../../brush/BrushSlots';
import { renderBrushThumbnail } from '../../brush/brushThumbnail';
import { DrawingToolId } from '../toolbox/state';
import { BrushColorIndex } from '../../domain/BrushColorIndex';
import {
  flipHorizontal,
  flipVertical,
  rotate90,
  rotate,
  resize,
  shearHorizontal,
  bendHorizontal,
  bendVertical,
  BendControls,
  CornerMove,
  mirrorCornerX,
  mirrorCornerY,
  rotateCorner90,
  scaleCorner,
} from '../../algorithm/brushTransform';

// DPaint switches away to (dotted) freehand when a built-in brush is picked
// while a fill tool is active, since a brush stamp and an area fill don't
// combine: this app switches to plain freehand instead.
const TOOLS_INCOMPATIBLE_WITH_BRUSHES: DrawingToolId[] = [
  'floodFill',
  'rectangleFilled',
  'circleFilled',
  'ellipseFilled',
  'polygonFilled',
];

export const selectBuiltInBrush = (context: Context, brushNumber: BuiltInBrushId): void => {
  context.state.brush.selectedBuiltInBrushId = brushNumber;
  context.state.brush.usingBuiltInBrush = true;
  // banks the outgoing custom brush into Previous (docs/brush-slots.md)
  brushRecall.setBuiltIn(builtInBrushes[brushNumber]);
  context.actions.brush.refreshPreviousBrushSlot();
  // Matte and Repl need a captured color, so they are custom-brush-only and
  // fall back to Color on a built-in. Every other mode works with a built-in
  // shape, so switching brushes mid-effect must not reset it to Color.
  if (context.state.brush.mode === 'Matte' || context.state.brush.mode === 'Repl') {
    context.actions.brush.setMode('Color');
  } else {
    context.actions.brush.setMode(context.state.brush.mode);
  }
  if (
    TOOLS_INCOMPATIBLE_WITH_BRUSHES.includes(context.state.toolbox.activeToolId as DrawingToolId)
  ) {
    context.actions.toolbox.setSelectedDrawingTool('freeHand');
  }
};

// Right-click entry point for BuiltInBrushes.tsx (docs/brush-transforms.md):
// selectBuiltInBrush, plus for the 1-pixel dot a swap to a resizable size-1
// round brush. The dot is a bare PixelBrush, not a CustomBrush, so it cannot be
// dragged to a new size. DPaint did the same (MODES.C: `if
// ((pn==0)||(pn==USERBRUSH)) pnType = ROUND_B`).
export const armBuiltInBrushForSizing = (context: Context, brushNumber: BuiltInBrushId): void => {
  context.actions.brush.selectBuiltInBrush(brushNumber);
  if (brushNumber === 1) {
    brushRecall.setBuiltIn(createSizedBuiltInBrush('round', 1, 1));
    // selectBuiltInBrush already ran setMode, but against the outgoing
    // PixelBrush. This fresh CustomBrush has never been colorized, so its
    // resting bitmap is still the raw matte and would render as whatever sits
    // in palette slot 0. Re-run setMode to colorize this instance.
    context.actions.brush.setMode(context.state.brush.mode);
  }
};

// Called when a new custom (captured or loaded) brush becomes the current
// brush (the brushRecall.setCustom that installed it dropped the snapshot)
export const clearBuiltInBrushSelection = (context: Context): void => {
  context.state.brush.selectedBuiltInBrushId = null;
  context.state.brush.usingBuiltInBrush = false;
  context.state.brush.hasOriginalBrush = false;
};

export const setHandleMode = (context: Context, mode: HandleMode): void => {
  context.state.brush.handleMode = mode;
};

export const setMode = (context: Context, mode: Mode): void => {
  context.state.brush.mode = mode;
  const brush = brushRecall.current;
  if (brush instanceof CustomBrush) {
    brush.applyMode(mode); // which modes get the colorized vs matte bitmap
  }
};

export const toFGBrush = (context: Context): void => {
  const brush = brushRecall.current;
  if (!(brush instanceof CustomBrush)) {
    return;
  }
  if (usesColorizedBrush(context.state.brush.mode)) {
    brush.toFGColor();
  } else {
    brush.toMatte();
  }
};

export const toBGBrush = (context: Context): void => {
  const brush = brushRecall.current;
  if (brush instanceof CustomBrush) {
    brush.toBGColor();
  }
};

// Brush transformations (docs/brush-transforms.md). No-ops for built-in
// brushes, like DPaint's curpen == USERBRUSH guard. Built-ins are CustomBrush
// instances too, so the identity check matters.
//
// A brush is uploaded as a GL texture, so doubling is capped at the realistic
// device floor for MAX_TEXTURE_SIZE. Comfortably above any capturable canvas,
// since a whole-screen brush that refuses to double reads as broken.
const MAX_BRUSH_DIMENSION = 4096;

const transformBrush = (
  context: Context,
  fn: (index: BrushColorIndex) => BrushColorIndex,
  moveCorner?: CornerMove
): void => {
  const brush = brushRecall.current;
  if (!(brush instanceof CustomBrush) || isBuiltInBrush(brush)) {
    return;
  }
  // setTransformed keeps the pre-transform original for Restore / Shift-B
  brushRecall.setTransformed(brush.transform(fn, moveCorner));
  context.state.brush.hasOriginalBrush = true;
  // re-derive the new brush's colorized variants and resting bitmap
  context.actions.brush.setMode(context.state.brush.mode);
};

// Restore / Shift-B undoes a transformed custom brush back to the brush as
// captured or loaded. Every transform is undone, DPaint's revert kept flips.
// The simpler rule, and a flip is one keypress to redo. Disabled on a built-in
// (BrushMenu.tsx): DPaint's Shift-B also re-activated the last custom brush,
// but that is the Previous slot's job now (docs/brush-slots.md).
export const restoreOriginalBrush = (context: Context): void => {
  const original = brushRecall.originalBrush;
  if (original === null) {
    return;
  }
  brushRecall.restore(original); // drops the snapshot: nothing left to restore
  context.state.brush.hasOriginalBrush = false;
  context.actions.brush.setMode(context.state.brush.mode);
};

// The three transforms DPaint carried its handle through get a rule for the
// capture corner (docs/brush-handle.md); shear, bend and free rotation do not,
// and drop it.
export const flipBrushHorizontal = (context: Context): void => {
  transformBrush(context, flipHorizontal, mirrorCornerX);
};

export const flipBrushVertical = (context: Context): void => {
  transformBrush(context, flipVertical, mirrorCornerY);
};

export const rotateBrush90 = (context: Context): void => {
  transformBrush(context, rotate90, rotateCorner90);
};

export const halveBrush = (context: Context): void => {
  transformBrush(context, (b) => resize(b, b.width / 2, b.height / 2), scaleCorner);
};

const doubleBrushBy = (context: Context, scaleX: number, scaleY: number): void => {
  const brush = brushRecall.current;
  if (!(brush instanceof CustomBrush)) {
    return;
  }
  if (brush.width * scaleX > MAX_BRUSH_DIMENSION || brush.heigth * scaleY > MAX_BRUSH_DIMENSION) {
    return;
  }
  transformBrush(context, (b) => resize(b, b.width * scaleX, b.height * scaleY), scaleCorner);
};

export const doubleBrush = (context: Context): void => {
  doubleBrushBy(context, 2, 2);
};

export const doubleBrushHorizontal = (context: Context): void => {
  doubleBrushBy(context, 2, 1);
};

export const doubleBrushVertical = (context: Context): void => {
  doubleBrushBy(context, 1, 2);
};

// Commits of the interactive drags (Stretch/ShearBrushTool): the preview
// frames were temporary brushes, so these are the drags' only real transform.
export const stretchBrushTo = (context: Context, size: { width: number; height: number }): void => {
  transformBrush(context, (b) => resize(b, size.width, size.height), scaleCorner);
};

// Commits the right-click drag-resize of a built-in brush
// (SizeBuiltInBrushTool, docs/brush-transforms.md): DPaint's SizePen (MODES.C).
// A separate path from Stretch above: it regenerates the family's shape at the
// new size rather than resampling a bitmap, and stays tagged as a built-in, so
// Matte/Repl and Previous-banking remain disabled.
export const resizeBuiltInBrushTo = (
  context: Context,
  size: { width: number; height: number }
): void => {
  const brush = brushRecall.current;
  if (!(brush instanceof CustomBrush) || brush.builtInFamily === undefined) {
    return;
  }
  const resized = createSizedBuiltInBrush(brush.builtInFamily, size.width, size.height);
  brushRecall.setBuiltIn(resized);
  // No preset icon matches a custom-dragged size: DPaint's cpPenBox = -1
  // (CTRPAN.C:189). usingBuiltInBrush stays true: that is the flag Matte/Repl
  // and the transform menu key off, so it outlives the id clearing here.
  context.state.brush.selectedBuiltInBrushId = null;
  context.state.brush.usingBuiltInBrush = true;
  context.actions.brush.setMode(context.state.brush.mode);
};

export const shearBrushBy = (context: Context, dx: number): void => {
  if (dx === 0) {
    return; // a no-move drag shouldn't bank a snapshot-less "transform"
  }
  transformBrush(context, (b) => shearHorizontal(b, dx));
};

export const rotateBrushBy = (context: Context, degrees: number): void => {
  if (degrees === 0) {
    return;
  }
  transformBrush(context, (b) => rotate(b, degrees));
};

export const bendBrushBy = (
  context: Context,
  payload: { horizontal: boolean; controls: BendControls }
): void => {
  const { start, middle, end } = payload.controls;
  if (start === 0 && middle === 0 && end === 0) {
    return;
  }
  transformBrush(context, (b) =>
    payload.horizontal ? bendHorizontal(b, payload.controls) : bendVertical(b, payload.controls)
  );
};

// Brush slots (docs/brush-slots.md): a bounded stash the user curates,
// separate from the automatic recall chain above.
const BRUSH_SLOT_THUMBNAIL_SIZE = 140;

export const storeBrushInSlot = (context: Context, index: number): void => {
  const brush = brushRecall.current;
  if (!(brush instanceof CustomBrush) || isBuiltInBrush(brush)) {
    return; // nothing to store from a built-in or the pixel brush
  }
  brushSlots.store(index, brush);
  context.state.brush.slots[index] = {
    occupied: true,
    thumbnail: renderBrushThumbnail(brush, BRUSH_SLOT_THUMBNAIL_SIZE),
    size: { width: brush.width, height: brush.heigth },
  };
};

export const recallBrushFromSlot = (context: Context, index: number): void => {
  const brush = brushSlots.recall(index);
  if (!brush) {
    return;
  }
  activateCustomBrush(context, brush);
};

export const clearBrushSlot = (context: Context, index: number): void => {
  brushSlots.clear(index);
  context.state.brush.slots[index] = { occupied: false, thumbnail: null, size: null };
};

// The Previous slot (docs/brush-slots.md): the automatic companion to the
// curated slots, populated by BrushRecall.setCustom whenever a different custom
// brush takes over. No store/clear: this one is not curated.
export const refreshPreviousBrushSlot = (context: Context): void => {
  const previous = brushRecall.previousBrush;
  context.state.brush.previousSlot = previous
    ? {
        occupied: true,
        thumbnail: renderBrushThumbnail(previous, BRUSH_SLOT_THUMBNAIL_SIZE),
        size: { width: previous.width, height: previous.heigth },
      }
    : { occupied: false, thumbnail: null, size: null };
};

export const recallPreviousBrush = (context: Context): void => {
  const previous = brushRecall.previousBrush;
  if (!previous) {
    return;
  }
  // A copy, independent of the stored reference, as BrushSlots.recall.
  // setCustom then banks the brush this replaces, so Previous is a two-way
  // swap.
  const brush = previous.transform((matte) => matte);
  activateCustomBrush(context, brush);
};

// Shared tail of every "a different custom brush becomes current" flow that is
// not a fresh capture or load: those call brushRecall.setCustom directly, in
// BrushSelector.tsx and BrushLoadDialog.tsx.
function activateCustomBrush(context: Context, brush: CustomBrush): void {
  brushRecall.setCustom(brush);
  context.actions.brush.clearBuiltInBrushSelection();
  context.actions.brush.setMode(context.state.brush.mode);
  context.actions.brush.refreshPreviousBrushSlot();
}
