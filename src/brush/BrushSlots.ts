import { CustomBrush } from './CustomBrush';

export const BRUSH_SLOT_COUNT = 8;

// Deliberate, bounded brush storage (docs/brush-slots.md Phase B): a fixed
// row of slots the user curates, distinct from brushRecall's automatic
// recall chain. A class instance kept out of Overmind state, like
// brushRecall — the reactive mirror (state.brush.slots) carries only what
// the UI needs to re-render (occupied flag + thumbnail + size).
class BrushSlots {
  private slots: (CustomBrush | null)[] = new Array(BRUSH_SLOT_COUNT).fill(null);

  store(index: number, brush: CustomBrush): void {
    this.slots[index] = brush;
  }

  // A copy, independent of what's stored — transforming a recalled brush
  // must not mutate the slot. transform() always allocates a new backing
  // array and never touches `this`, so handing it the identity function is a
  // cheap, safe clone.
  recall(index: number): CustomBrush | null {
    const stored = this.slots[index];
    return stored ? stored.transform((matte) => matte) : null;
  }

  clear(index: number): void {
    this.slots[index] = null;
  }
}

export const brushSlots = new BrushSlots();
