import { overmind } from '../..';
import { paintingCanvasController } from '../paintingCanvas/PaintingCanvasController';
import { stencil } from '../Stencil';
import { LockedColors } from '../../algorithm/stencilMask';

// Temporary console access while the stencil has no menu (docs/stencil.md,
// phase 1). Remove once the Effects drawer lands.

function make(...colorNumbers: number[]): string {
  const canvas = paintingCanvasController.getCanvasColorIndex();
  if (!canvas) {
    return 'no canvas';
  }
  const locked: LockedColors = [];
  const numbers = colorNumbers.length
    ? colorNumbers
    : [Number(overmind.state.palette.foregroundColorId)];
  for (const n of numbers) {
    locked[n] = true;
  }
  stencil.make(canvas, locked);
  paintingCanvasController.updateStencil();
  return `locked ${numbers.join(', ')}`;
}

function remake(): string {
  const canvas = paintingCanvasController.getCanvasColorIndex();
  if (!canvas) {
    return 'no canvas';
  }
  stencil.remake(canvas);
  paintingCanvasController.updateStencil();
  return 'remade';
}

function reverse(): string {
  const canvas = paintingCanvasController.getCanvasColorIndex();
  if (!canvas) {
    return 'no canvas';
  }
  stencil.reverse(canvas);
  paintingCanvasController.updateStencil();
  return 'reversed';
}

function toggle(): string {
  stencil.setEnabled(!stencil.enabled);
  paintingCanvasController.updateStencil();
  return stencil.enabled ? 'on' : 'off';
}

function free(): string {
  stencil.free();
  paintingCanvasController.updateStencil();
  return 'freed';
}

const stencilHarness = { make, remake, reverse, toggle, free };

declare global {
  interface Window {
    __redpaintStencil: typeof stencilHarness;
  }
}

window.__redpaintStencil = stencilHarness;
