import { CustomBrush } from './CustomBrush';

export const BRUSH_SLOT_COUNT = 8;

// Deliberate, bounded brush storage (docs/brush-slots.md Phase B): a fixed row
// of slots the user curates, distinct from brushRecall's automatic recall
// chain. A class instance kept out of Overmind state, like brushRecall. The
// reactive mirror (state.brush.slots) carries only what the UI needs to
// re-render (occupied flag + thumbnail + size).
class BrushSlots {
  private slots: (CustomBrush | null)[] = new Array(BRUSH_SLOT_COUNT).fill(null);

  store(index: number, brush: CustomBrush): void {
    this.slots[index] = brush;
  }

  // A copy, independent of what's stored: transforming a recalled brush must
  // not mutate the slot.
  recall(index: number): CustomBrush | null {
    return this.slots[index]?.clone() ?? null;
  }

  clear(index: number): void {
    this.slots[index] = null;
  }
}

export const brushSlots = new BrushSlots();
