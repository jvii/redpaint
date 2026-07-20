import { Context } from '../../overmind';
import { Mode, BuiltInBrushId, builtInBrushes, isBuiltInBrush } from './state';
import { usesColorizedBrush } from './mode';
import { CustomBrush } from '../../brush/CustomBrush';
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
} from '../../algorithm/brushTransform';

// DPaint switches away to (dotted) freehand when a built-in brush is picked
// while a fill tool is active, since a brush stamp and an area fill don't
// combine — this app switches to plain freehand instead.
const TOOLS_INCOMPATIBLE_WITH_BRUSHES: DrawingToolId[] = [
  'floodFill',
  'rectangleFilled',
  'circleFilled',
  'ellipseFilled',
  'polygonFilled',
];

export const selectBuiltInBrush = (context: Context, brushNumber: BuiltInBrushId): void => {
  context.state.brush.selectedBuiltInBrushId = brushNumber;
  // a detour: the custom brush and its pre-transform original stay recallable
  brushRecall.setBuiltIn(builtInBrushes[brushNumber]);
  // Matte and Repl are custom-brush-only (disabled in the menu for built-ins,
  // since a built-in shape has no inherent captured color) — falling back to
  // Color there matches the old single-Matte/Color world. Every other mode
  // (the canvas-reading effects, Cycle) works fine with a built-in shape, so
  // switching a brush mid-effect shouldn't silently reset it to Color.
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

// Called when a new custom (captured or loaded) brush becomes the current
// brush (the brushRecall.setCustom that installed it dropped the snapshot)
export const clearBuiltInBrushSelection = (context: Context): void => {
  context.state.brush.selectedBuiltInBrushId = null;
  context.state.brush.hasOriginalBrush = false;
  context.state.brush.hasLastCustomBrush = true;
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

// Brush transformations (docs/brush-transforms.md). Strictly no-ops for
// built-in brushes, like DPaint's curpen == USERBRUSH guard — built-ins are
// CustomBrush instances too, so the identity check matters.
// DPaint snapped a brush back when a stretch ran out of memory; the
// equivalent here is refusing to double past a sanity cap. The brush is
// uploaded as a GL texture, so the cap tracks the realistic device floor for
// MAX_TEXTURE_SIZE — it must stay comfortably above any capturable canvas
// area, since a whole-screen brush that refuses to double reads as broken.
const MAX_BRUSH_DIMENSION = 4096;

const transformBrush = (
  context: Context,
  fn: (index: BrushColorIndex) => BrushColorIndex
): void => {
  const brush = brushRecall.current;
  if (!(brush instanceof CustomBrush) || isBuiltInBrush(brush)) {
    return;
  }
  // setTransformed keeps the pre-transform original for Restore / Shift-B
  brushRecall.setTransformed(brush.transform(fn));
  context.state.brush.hasOriginalBrush = true;
  // re-derive the new brush's colorized variants and resting bitmap
  context.actions.brush.setMode(context.state.brush.mode);
};

// Restore / Shift-B walks the recall chain (docs/brush-slots.md), one step
// per press, DPaint-style:
// 1. on a built-in brush — re-activate the last custom brush as it was left
//    (DPaint's UserBr), keeping its pre-transform original for a second press;
// 2. on a transformed custom brush — back to the brush as it was captured or
//    loaded. A simplification of DPaint (which kept flips through its
//    revert): every transform is undone, the easier rule to predict — and a
//    flip is one keypress to redo.
export const restoreOriginalBrush = (context: Context): void => {
  if (context.state.brush.selectedBuiltInBrushId !== null) {
    if (brushRecall.lastCustomBrush === null) {
      return;
    }
    brushRecall.reactivateLastCustom();
    context.state.brush.selectedBuiltInBrushId = null;
  } else {
    const original = brushRecall.originalBrush;
    if (original === null) {
      return;
    }
    brushRecall.setCustom(original); // drops the snapshot: nothing left to restore
    context.state.brush.hasOriginalBrush = false;
    context.actions.brush.refreshPreviousBrushSlot();
  }
  context.actions.brush.setMode(context.state.brush.mode);
};

export const flipBrushHorizontal = (context: Context): void => {
  transformBrush(context, flipHorizontal);
};

export const flipBrushVertical = (context: Context): void => {
  transformBrush(context, flipVertical);
};

export const rotateBrush90 = (context: Context): void => {
  transformBrush(context, rotate90);
};

export const halveBrush = (context: Context): void => {
  transformBrush(context, (b) => resize(b, b.width / 2, b.height / 2));
};

const doubleBrushBy = (context: Context, scaleX: number, scaleY: number): void => {
  const brush = brushRecall.current;
  if (!(brush instanceof CustomBrush)) {
    return;
  }
  if (brush.width * scaleX > MAX_BRUSH_DIMENSION || brush.heigth * scaleY > MAX_BRUSH_DIMENSION) {
    return;
  }
  transformBrush(context, (b) => resize(b, b.width * scaleX, b.height * scaleY));
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
  transformBrush(context, (b) => resize(b, size.width, size.height));
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

// Brush slots (docs/brush-slots.md Phase B): a deliberate, bounded stash the
// user curates, separate from the automatic recall chain above. Fixed size
// matching BRUSH_SLOT_COUNT.
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
// curated slots above, populated by BrushRecall.setCustom itself whenever a
// different custom brush takes over. No store/clear — the user doesn't
// curate this one.
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
  // a copy, independent of the stored reference — same reasoning as
  // BrushSlots.recall. setCustom below then banks the brush this replaces
  // as the new previousBrush, so recalling Previous is a two-way swap.
  const brush = previous.transform((matte) => matte);
  activateCustomBrush(context, brush);
};

// Shared tail of every "a different custom brush becomes current" flow that
// isn't a fresh capture/load (those go through brushRecall.setCustom
// directly in BrushSelector.tsx / BrushLoadDialog.tsx, since they also need
// to open dialogs / decode files first).
function activateCustomBrush(context: Context, brush: CustomBrush): void {
  brushRecall.setCustom(brush);
  context.actions.brush.clearBuiltInBrushSelection();
  context.actions.brush.setMode(context.state.brush.mode);
  context.actions.brush.refreshPreviousBrushSlot();
}
