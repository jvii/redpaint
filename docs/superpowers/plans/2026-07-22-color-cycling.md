# Color Cycling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Animate each palette range's colors over time (DPaint's Tab cycling), display-only, with per-range rate/active/reverse settings that round-trip through IFF CRNG chunks.

**Architecture:** A rAF-driven `CycleDriver` singleton advances per-range fractional step accumulators and, only when an integer offset changes, dispatches `setCycleOffsets` to Overmind and re-uploads both GL palette textures. The document palette (`state.palette.palette`) never changes while cycling; rotation happens when composing the 256×1 palette texture and the derived `displayPalette` the React swatches read. Pure math lives in `src/algorithm/cycle.ts`. Spec: `docs/color-cycling.md`.

**Tech Stack:** TypeScript (tsconfig `strict: false`, but ESLint requires explicit return types), React 19, Overmind (namespaced modules), raw WebGL1, Vitest.

## Global Constraints

- **No new dependencies.** Everything is hand-rolled, like the rest of the repo.
- **Formatting:** Prettier, 100-col width, single quotes, ES5 trailing commas (`.prettierrc.json`). Run `npx prettier --write <files>` before committing.
- **Commit messages:** imperative subject, no conventional-commit prefixes (repo style: "Add Cycle mode stepping the active range per stamp", not "feat: ...").
- **Tests** live under `test/`, mirroring `src/` (e.g. `test/algorithm/cycle.test.ts` tests `src/algorithm/cycle.ts`). Only the pure layers are tested; UI/canvas/Overmind layers are deliberately untested.
- **Commands:** `npm test` (Vitest, single run), `npm run build` (tsc --noEmit + vite build), `npm run lint`, `npm start` (dev server pinned to http://localhost:3000).
- **Color ids are 1-based strings** app-wide (`'1'`..`'256'`); CRNG `low`/`high` are 0-based palette positions. The ±1 conversion lives only in `cycleRangesToPaletteRanges` (load) and `Menu.tsx` (save).
- **Rate unit:** raw CRNG units everywhere in state and files; `16384 = 60 steps/second`. UI converts to steps/second for display only. `DEFAULT_CYCLE_RATE = 8192` (30 steps/s). `MIN_RANGE_SLOTS = 6`.
- **Reading derived Overmind state from inside actions returns `undefined`** (bundled Overmind quirk, see the note in `src/overmind/palette/state.ts`). Canvas controllers are called from actions (undo, canvas resize), so they must compute display colors from **raw** state fields via the pure helpers — never from the `displayPalette` derived. React components may use deriveds freely.
- **Direction convention** (`docs/color-cycling.md`): forward cycling displays, at slot `i` of range `[s..e]` with offset `k`, the base color of `s + ((i − s + k) mod span)`. Task 10 verifies the visual direction against a real DPaint cycling image before this is trusted.

---

### Task 1: Range model — `CycleRange` with rate/active/reverse, six uncapped slots

**Files:**
- Modify: `src/algorithm/paletteRange.ts`
- Modify: `src/overmind/palette/state.ts`
- Modify: `src/overmind/palette/actions.ts`
- Modify: `src/overmind/fillStyle/state.ts`
- Modify: `src/overmind/fillStyle/actions.ts:13`
- Modify: `src/components/fillStyle/FillStyleSettings.tsx` (the `setRangeIndex` cast)
- Modify: `src/components/menu/Menu.tsx` (the `handleImageSaveIlbm` cycleRanges block)
- Modify: `src/components/paletteEditor/PaletteEditor.tsx` (RANGE_OPTIONS becomes dynamic)
- Test: `test/algorithm/paletteRange.test.ts`

**Interfaces:**
- Consumes: `IlbmCycleRange` (`src/fileformat/ilbm.ts`: `{low, high, rate, active, reverse}` — already parsed, unchanged).
- Produces: `CycleRange { start: string; end: string; rate: number; active: boolean; reverse: boolean }`, `MIN_RANGE_SLOTS = 6`, `DEFAULT_CYCLE_RATE = 8192` (all exported from `src/algorithm/paletteRange.ts`); `PaletteRange` (in `src/overmind/palette/state.ts`) becomes an alias of `CycleRange`; `cycleRangesToPaletteRanges` returns `(CycleRange | null)[]` uncapped, padded to `MIN_RANGE_SLOTS`; new action `palette.setRangeSettings({rangeIndex, rate?, active?, reverse?})`. Tasks 2, 5, 8, 9 rely on these exact names.

- [ ] **Step 1: Write the failing tests**

In `test/algorithm/paletteRange.test.ts`, replace the existing `describe('cycleRangesToPaletteRanges', ...)` block (it asserts the old 4-slot `{start, end}` shape; if the block doesn't exist, just add this) with:

```ts
describe('cycleRangesToPaletteRanges', () => {
  const crng = (
    low: number,
    high: number,
    extra: Partial<{ rate: number; active: boolean; reverse: boolean }> = {}
  ): { low: number; high: number; rate: number; active: boolean; reverse: boolean } => ({
    low,
    high,
    rate: 8192,
    active: true,
    reverse: false,
    ...extra,
  });

  it('maps CRNG positions to 1-based color ids and keeps rate/active/reverse', () => {
    const ranges = cycleRangesToPaletteRanges([crng(2, 5, { rate: 16384, reverse: true })]);
    expect(ranges[0]).toEqual({
      start: '3',
      end: '6',
      rate: 16384,
      active: true,
      reverse: true,
    });
  });

  it('pads with nulls up to the six default slots', () => {
    const ranges = cycleRangesToPaletteRanges([crng(0, 3)]);
    expect(ranges).toHaveLength(6);
    expect(ranges.slice(1)).toEqual([null, null, null, null, null]);
  });

  it('keeps every usable range — no cap at the default slot count', () => {
    const eight = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => crng(i * 2, i * 2 + 1));
    const ranges = cycleRangesToPaletteRanges(eight);
    expect(ranges).toHaveLength(8);
    expect(ranges.every((r) => r !== null)).toBe(true);
  });

  it('drops degenerate ranges (DPaint writes unset slots as low >= high)', () => {
    const ranges = cycleRangesToPaletteRanges([crng(0, 0), crng(5, 3), crng(1, 2)]);
    expect(ranges[0]).toMatchObject({ start: '2', end: '3' });
    expect(ranges).toHaveLength(6);
    expect(ranges[1]).toBeNull();
  });

  it('keeps an inactive range (gradient-only CRNG) as data', () => {
    const ranges = cycleRangesToPaletteRanges([crng(1, 4, { active: false })]);
    expect(ranges[0]).toMatchObject({ active: false });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- test/algorithm/paletteRange.test.ts`
Expected: FAIL — the current implementation returns 4 fixed slots of `{start, end}` with no `rate`/`active`/`reverse`.

- [ ] **Step 3: Implement the new range model**

Replace the `cycleRangesToPaletteRanges` section of `src/algorithm/paletteRange.ts` (everything from its doc comment to the end of the file) with:

```ts
// A contiguous span of palette slots plus its color-cycling settings.
// DPaint's Palette Window had four of these; ours defaults to six
// (MIN_RANGE_SLOTS) and grows past that when a loaded IFF carries more CRNG
// chunks — the chunk is repeatable and real files exceed four. Gradient
// Fill and the Shade/Blend/Cycle paint modes key off start/end only;
// rate/active/reverse belong to color cycling (docs/color-cycling.md).
export interface CycleRange {
  start: string; // 1-based color id, inclusive
  end: string; // 1-based color id, inclusive
  rate: number; // raw CRNG units: 16384 = 60 steps/second, 0 = holds still
  active: boolean; // participates when cycling is on
  reverse: boolean; // cycles end -> start instead of start -> end
}

export const MIN_RANGE_SLOTS = 6;
export const DEFAULT_CYCLE_RATE = 8192; // 30 steps/second

// DPaint's CRNG ranges (an IFF ILBM concept, see src/fileformat/ilbm.ts)
// become range slots (color ids are 1-based where CRNG positions are
// 0-based). Every usable chunk is kept — no cap — and the list is padded to
// the six default slots. DPaint writes unset slots as degenerate low >= high
// entries; those are dropped.
export function cycleRangesToPaletteRanges(
  cycleRanges: { low: number; high: number; rate: number; active: boolean; reverse: boolean }[]
): (CycleRange | null)[] {
  const slots: (CycleRange | null)[] = cycleRanges
    .filter((r) => r.low < r.high)
    .map((r) => ({
      start: String(r.low + 1),
      end: String(r.high + 1),
      rate: r.rate,
      active: r.active,
      reverse: r.reverse,
    }));
  while (slots.length < MIN_RANGE_SLOTS) {
    slots.push(null);
  }
  return slots;
}
```

In `src/overmind/palette/state.ts`:

1. Add the import and replace the local `PaletteRange` type with an alias (keep the existing doc comment above it, updating "up to four of these" wording to match):

```ts
import { CycleRange, DEFAULT_CYCLE_RATE } from '../../algorithm/paletteRange';

// A contiguous span of palette slots with cycling settings (see
// src/algorithm/paletteRange.ts). Color Cycling, Gradient Fill and the
// Blend/Shade painting modes all key off "the range containing color X".
export type PaletteRange = CycleRange;
```

2. Replace the `ranges` initial value (six slots now):

```ts
  // Range slots (DPaint's Range 1..4, ours defaults to six), unset slots are
  // null. The list grows past six when a loaded IFF carries more CRNG chunks.
  // Range 1 defaults to the grey ramp (the default 32-color palette's last
  // 12 entries), matching DPaint's own default range.
  ranges: [
    { start: '21', end: '32', rate: DEFAULT_CYCLE_RATE, active: true, reverse: false },
    null,
    null,
    null,
    null,
    null,
  ],
```

3. Update the `ranges` field comment in the `State` type from "Fixed 4 slots (DPaint's Range 1..4), unset slots are null." to "Range slots, minimum six, uncapped (see the initial value below)."

In `src/overmind/palette/actions.ts`:

1. Add to the imports: `import { DEFAULT_CYCLE_RATE, MIN_RANGE_SLOTS } from '../../algorithm/paletteRange';`

2. `clampColorReferences` — preserve the new fields (spread instead of rebuilding):

```ts
  context.state.palette.ranges = context.state.palette.ranges.map((range) => {
    if (!range) {
      return null;
    }
    if (Number(range.start) > colors) {
      return null; // entirely outside the new palette
    }
    return { ...range, end: clampId(range.end) };
  });
```

3. `setRange` — keep the slot's cycling settings when re-picking endpoints, default them on a fresh slot:

```ts
export const setRange = (context: Context, { rangeIndex, start, end }: SetRangeParams): void => {
  const [lo, hi] = Number(start) <= Number(end) ? [start, end] : [end, start];
  const existing = context.state.palette.ranges[rangeIndex];
  context.state.palette.ranges[rangeIndex] = {
    start: lo,
    end: hi,
    rate: existing?.rate ?? DEFAULT_CYCLE_RATE,
    active: existing?.active ?? true,
    reverse: existing?.reverse ?? false,
  };
};
```

4. `clearRange` — prune empty slots above the six defaults (a slot that only existed because a loaded file carried it disappears once cleared), keeping the editor's selection in bounds:

```ts
export const clearRange = (context: Context, rangeIndex: number): void => {
  const ranges = context.state.palette.ranges;
  ranges[rangeIndex] = null;
  while (ranges.length > MIN_RANGE_SLOTS && ranges[ranges.length - 1] === null) {
    ranges.pop();
  }
  const active = context.state.paletteEditor.activeRangeIndex;
  if (active !== null && active >= ranges.length) {
    context.state.paletteEditor.activeRangeIndex = ranges.length - 1;
  }
};
```

5. Add the settings action (used by the palette editor in Task 8):

```ts
export interface SetRangeSettingsParams {
  rangeIndex: number;
  rate?: number;
  active?: boolean;
  reverse?: boolean;
}

// Updates a range slot's cycling settings in place. No-op on an unset slot —
// settings ride on a range, they don't create one.
export const setRangeSettings = (
  context: Context,
  { rangeIndex, rate, active, reverse }: SetRangeSettingsParams
): void => {
  const range = context.state.palette.ranges[rangeIndex];
  if (!range) {
    return;
  }
  if (rate !== undefined) {
    range.rate = rate;
  }
  if (active !== undefined) {
    range.active = active;
  }
  if (reverse !== undefined) {
    range.reverse = reverse;
  }
};
```

In `src/overmind/fillStyle/state.ts`: change both `rangeIndex: 0 | 1 | 2 | 3` occurrences (the `Snapshot` type and the `State` type) to `rangeIndex: number`, and the comment `// which of the palette's 4 ranges` to `// which of the palette's range slots`.

In `src/overmind/fillStyle/actions.ts:13`: change the signature to `export const setRangeIndex = (context: Context, rangeIndex: number): void => {`.

In `src/components/fillStyle/FillStyleSettings.tsx`, remove the now-unneeded cast:

```ts
                onChange={(value): void => actions.fillStyle.setRangeIndex(Number(value))}
```

In `src/components/menu/Menu.tsx`, replace the `cycleRanges` block inside `handleImageSaveIlbm` (the one hardcoding `rate: 8192`) with:

```ts
    const cycleRanges = state.palette.ranges.flatMap((range) =>
      range
        ? [
            {
              low: Number(range.start) - 1,
              high: Number(range.end) - 1,
              rate: range.rate,
              active: range.active,
              reverse: range.reverse,
            },
          ]
        : []
    );
```

In `src/components/paletteEditor/PaletteEditor.tsx`: delete the module-level `RANGE_OPTIONS` constant and derive it inside the component (below the `activeRange` line), so the selector tracks the variable-length list:

```ts
  const rangeOptions = state.palette.ranges.map((_, index) => ({
    value: String(index),
    label: String(index + 1),
  }));
```

and change the `<RetroToggle options={RANGE_OPTIONS} ...>` in the Range fieldset to `options={rangeOptions}`.

- [ ] **Step 4: Run tests and type-check**

Run: `npm test` — Expected: PASS (including the untouched `activeRangeIndices` suite — `CycleRange` is structurally assignable to its `{start, end}` params).
Run: `npm run build` — Expected: clean. If it reports other literal `{ start: ..., end: ... }` constructions assigned to `PaletteRange`, fix them the same way as `setRange` (spread defaults).

- [ ] **Step 5: Commit**

```bash
git add src/algorithm/paletteRange.ts src/overmind/palette/state.ts src/overmind/palette/actions.ts src/overmind/fillStyle/state.ts src/overmind/fillStyle/actions.ts src/components/fillStyle/FillStyleSettings.tsx src/components/menu/Menu.tsx src/components/paletteEditor/PaletteEditor.tsx test/algorithm/paletteRange.test.ts
git commit -m "Carry CRNG rate/active/reverse on ranges, uncap the slot list at six"
```

---

### Task 2: Pure cycling math in `src/algorithm/cycle.ts`

**Files:**
- Modify: `src/algorithm/cycle.ts`
- Test: `test/algorithm/cycle.test.ts`

**Interfaces:**
- Consumes: `CycleRange` from Task 1; `Color` from `src/types.ts` (`{r: number; g: number; b: number}`).
- Produces (Tasks 3, 4, 5, 8 rely on these exact signatures):
  - `rateToStepsPerSecond(rate: number): number`
  - `stepsPerSecondToRate(steps: number): number`
  - `advanceCycleSteps(accumulators: number[], ranges: (CycleRange | null)[], elapsedMs: number): number[]`
  - `cycleOffsetsOf(accumulators: number[], ranges: (CycleRange | null)[]): number[]` — always non-negative, `0` for inactive/null/span≤1 slots
  - `cycledPalette(palette: {[id: string]: Color}, ranges: (CycleRange | null)[], offsets: number[]): {[id: string]: Color}`
  - `paletteTextureData(palette: {[id: string]: Color}, ranges: (CycleRange | null)[], offsets: number[]): Uint8Array` — 256×4 RGBA bytes for the GL palette texture

- [ ] **Step 1: Write the failing tests**

Append to `test/algorithm/cycle.test.ts` (keep the existing `cycleColorIndex` suite):

```ts
import {
  advanceCycleSteps,
  cycleOffsetsOf,
  cycledPalette,
  paletteTextureData,
  rateToStepsPerSecond,
  stepsPerSecondToRate,
} from '../../src/algorithm/cycle';
import { CycleRange } from '../../src/algorithm/paletteRange';

const range = (start: string, end: string, extra: Partial<CycleRange> = {}): CycleRange => ({
  start,
  end,
  rate: 8192,
  active: true,
  reverse: false,
  ...extra,
});

describe('rate conversions', () => {
  it('16384 CRNG units is 60 steps per second', () => {
    expect(rateToStepsPerSecond(16384)).toBe(60);
    expect(stepsPerSecondToRate(60)).toBe(16384);
  });

  it('round-trips whole steps-per-second values', () => {
    for (let s = 0; s <= 60; s++) {
      expect(Math.round(rateToStepsPerSecond(stepsPerSecondToRate(s)))).toBe(s);
    }
  });
});

describe('advanceCycleSteps', () => {
  it('advances by rate over elapsed time', () => {
    // 16384 = 60 steps/s -> 1000ms adds 60 steps; 8192 -> 500ms adds 15
    expect(advanceCycleSteps([0], [range('1', '4', { rate: 16384 })], 1000)).toEqual([60]);
    expect(advanceCycleSteps([2], [range('1', '4', { rate: 8192 })], 500)).toEqual([17]);
  });

  it('accumulates fractional steps', () => {
    const [acc] = advanceCycleSteps([0], [range('1', '4', { rate: 16384 })], 10);
    expect(acc).toBeCloseTo(0.6);
  });

  it('holds still for null, inactive, and rate-0 slots', () => {
    const ranges = [null, range('1', '4', { active: false }), range('1', '4', { rate: 0 })];
    expect(advanceCycleSteps([1, 2, 3], ranges, 1000)).toEqual([1, 2, 3]);
  });

  it('treats a missing accumulator as 0 (range list grew mid-flight)', () => {
    expect(advanceCycleSteps([], [range('1', '4', { rate: 16384 })], 1000)).toEqual([60]);
  });
});

describe('cycleOffsetsOf', () => {
  it('wraps whole steps to the range span', () => {
    // span 3 (ids 2..4): 5.9 steps -> floor 5 -> offset 2
    expect(cycleOffsetsOf([5.9], [range('2', '4')])).toEqual([2]);
  });

  it('reverse runs the offset the other way around the span', () => {
    expect(cycleOffsetsOf([5.9], [range('2', '4', { reverse: true })])).toEqual([1]);
    // a whole number of laps is offset 0 in either direction
    expect(cycleOffsetsOf([3], [range('2', '4', { reverse: true })])).toEqual([0]);
  });

  it('is 0 for null, inactive, and single-color slots', () => {
    const ranges = [null, range('1', '4', { active: false }), range('7', '7')];
    expect(cycleOffsetsOf([9, 9, 9], ranges)).toEqual([0, 0, 0]);
  });
});

describe('cycledPalette', () => {
  const palette = {
    '1': { r: 10, g: 0, b: 0 },
    '2': { r: 20, g: 0, b: 0 },
    '3': { r: 30, g: 0, b: 0 },
    '4': { r: 40, g: 0, b: 0 },
    '5': { r: 50, g: 0, b: 0 },
  };

  it('is the identity at offset 0', () => {
    expect(cycledPalette(palette, [range('2', '4')], [0])).toEqual(palette);
  });

  it('rotates a range: forward offset k shows the color k slots later', () => {
    // docs/color-cycling.md: display[i] = base[s + ((i - s + k) mod span)]
    const display = cycledPalette(palette, [range('2', '4')], [1]);
    expect(display['2']).toEqual(palette['3']);
    expect(display['3']).toEqual(palette['4']);
    expect(display['4']).toEqual(palette['2']);
    expect(display['1']).toEqual(palette['1']); // outside the range: untouched
    expect(display['5']).toEqual(palette['5']);
  });

  it('reads each range from the base palette; later slots win on overlap', () => {
    const display = cycledPalette(palette, [range('1', '3'), range('3', '5')], [1, 1]);
    expect(display['2']).toEqual(palette['3']); // from range 1
    expect(display['3']).toEqual(palette['4']); // range 2 overwrites range 1's wrap
    expect(display['5']).toEqual(palette['3']); // range 2 wraps from base, not display
  });

  it('skips inactive and null slots', () => {
    const display = cycledPalette(palette, [null, range('2', '4', { active: false })], [3, 3]);
    expect(display).toEqual(palette);
  });

  it('normalizes reversed endpoints (stored end < start)', () => {
    const display = cycledPalette(palette, [range('4', '2')], [1]);
    expect(display['2']).toEqual(palette['3']);
  });
});

describe('paletteTextureData', () => {
  it('packs the cycled colors as 256 RGBA bytes, alpha 255', () => {
    const palette = { '1': { r: 1, g: 2, b: 3 }, '2': { r: 4, g: 5, b: 6 } };
    const data = paletteTextureData(palette, [range('1', '2')], [1]);
    expect(data.length).toBe(256 * 4);
    expect([...data.slice(0, 8)]).toEqual([4, 5, 6, 255, 1, 2, 3, 255]);
    expect(data[8]).toBe(0); // slots beyond the palette stay zeroed
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- test/algorithm/cycle.test.ts`
Expected: FAIL with "does not provide an export named 'advanceCycleSteps'" (or equivalent).

- [ ] **Step 3: Implement**

Append to `src/algorithm/cycle.ts`:

```ts
import { Color } from '../types';
import { CycleRange } from './paletteRange';

export const CRNG_FULL_RATE = 16384; // the CRNG unit: 16384 = 60 steps/second
export const MAX_STEPS_PER_SECOND = 60;

export function rateToStepsPerSecond(rate: number): number {
  return (rate / CRNG_FULL_RATE) * MAX_STEPS_PER_SECOND;
}

export function stepsPerSecondToRate(steps: number): number {
  return Math.round((steps / MAX_STEPS_PER_SECOND) * CRNG_FULL_RATE);
}

// Fractional cycling progress, advanced by wall-clock time: one accumulator
// per range slot. Null/inactive/rate-0 slots hold still. Pure — the caller
// (CycleDriver) owns the clock.
export function advanceCycleSteps(
  accumulators: number[],
  ranges: (CycleRange | null)[],
  elapsedMs: number
): number[] {
  return ranges.map((range, i) => {
    const acc = accumulators[i] ?? 0;
    if (!range || !range.active) {
      return acc;
    }
    return acc + (elapsedMs / 1000) * rateToStepsPerSecond(range.rate);
  });
}

function spanOf(range: CycleRange): { lo: number; span: number } {
  const lo = Math.min(Number(range.start), Number(range.end));
  const hi = Math.max(Number(range.start), Number(range.end));
  return { lo, span: hi - lo + 1 };
}

// Integer rotation offset per slot: whole steps taken, wrapped to the span.
// Reverse runs the other way around; the result is normalized to
// 0..span-1 either way, so consumers never see a negative offset.
export function cycleOffsetsOf(
  accumulators: number[],
  ranges: (CycleRange | null)[]
): number[] {
  return ranges.map((range, i) => {
    if (!range || !range.active) {
      return 0;
    }
    const { span } = spanOf(range);
    if (span <= 1) {
      return 0;
    }
    const steps = Math.floor(accumulators[i] ?? 0) % span;
    return range.reverse ? (span - steps) % span : steps;
  });
}

// The palette as displayed: each active range's slots rotated by its offset.
// Forward direction (docs/color-cycling.md): slot i shows the base color of
// s + ((i - s + k) mod span) — every range reads from the *base* palette,
// and slots apply in order, so on overlap the later range wins.
export function cycledPalette(
  palette: { [id: string]: Color },
  ranges: (CycleRange | null)[],
  offsets: number[]
): { [id: string]: Color } {
  const display = { ...palette };
  ranges.forEach((range, i) => {
    const offset = offsets[i] ?? 0;
    if (!range || !range.active || offset === 0) {
      return;
    }
    const { lo, span } = spanOf(range);
    if (span <= 1) {
      return;
    }
    for (let id = lo; id < lo + span; id++) {
      const source = palette[String(lo + ((id - lo + offset) % span))];
      if (source) {
        display[String(id)] = source;
      }
    }
  });
  return display;
}

// The 256x1 RGBA palette texture, cycled — shared by both canvas
// controllers' texture uploads so rotation can't drift between them.
// Integer-like keys iterate in ascending numeric order, so Object.values
// yields the colors in id order (same assumption as paletteArray).
export function paletteTextureData(
  palette: { [id: string]: Color },
  ranges: (CycleRange | null)[],
  offsets: number[]
): Uint8Array {
  const colors = Object.values(cycledPalette(palette, ranges, offsets));
  const data = new Uint8Array(256 * 4);
  for (let i = 0; i < colors.length; i++) {
    data[i * 4 + 0] = colors[i].r;
    data[i * 4 + 1] = colors[i].g;
    data[i * 4 + 2] = colors[i].b;
    data[i * 4 + 3] = 255;
  }
  return data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- test/algorithm/cycle.test.ts`
Expected: PASS (all new suites plus the pre-existing `cycleColorIndex` suite).

- [ ] **Step 5: Commit**

```bash
git add src/algorithm/cycle.ts test/algorithm/cycle.test.ts
git commit -m "Add pure color-cycling math: step accumulation, offsets, palette rotation"
```

---

### Task 3: Overmind cycling state and display-palette deriveds

**Files:**
- Modify: `src/overmind/palette/state.ts`
- Modify: `src/overmind/palette/actions.ts`

**Interfaces:**
- Consumes: `cycledPalette` from Task 2.
- Produces (Tasks 5, 6, 7, 8 rely on these): `state.palette.cyclingOn: boolean`, `state.palette.cycleOffsets: number[]`, deriveds `state.palette.displayPalette: {[id: string]: Color}`, `displayForegroundColor: Color`, `displayBackgroundColor: Color`; action `palette.setCycleOffsets(offsets: number[])`. (`palette.toggleCycling` arrives in Task 5 with the driver.)

- [ ] **Step 1: Add the state fields and deriveds**

In `src/overmind/palette/state.ts`, add to the imports:

```ts
import { cycledPalette } from '../../algorithm/cycle';
```

Add to the `State` type (after `ranges`):

```ts
  // Color cycling animation (docs/color-cycling.md). Display-only: while
  // cycling, the GL palette textures and the display* deriveds rotate, but
  // palette/ranges above never change. cycleOffsets tracks ranges by index
  // (all zeros while cycling is off) and is written only by CycleDriver.
  cyclingOn: boolean;
  cycleOffsets: number[];
  // What the UI shows for each slot: the base palette with each cycling
  // range rotated by its current offset. Components read these; canvas
  // controllers compute the same rotation from the raw fields instead
  // (deriveds read as undefined inside actions — see the note above).
  readonly displayPalette: { [id: string]: Color };
  readonly displayForegroundColor: Color;
  readonly displayBackgroundColor: Color;
```

Add to the `state` object (after the `ranges` value):

```ts
  cyclingOn: false,
  cycleOffsets: [0, 0, 0, 0, 0, 0],
  displayPalette: derived((state: State) =>
    cycledPalette(state.palette, state.ranges, state.cycleOffsets)
  ),
  displayForegroundColor: derived(
    (state: State) => state.foregroundRgb ?? state.displayPalette[state.foregroundColorId]
  ),
  displayBackgroundColor: derived(
    (state: State) => state.displayPalette[state.backgroundColorId]
  ),
```

- [ ] **Step 2: Add the offsets action**

In `src/overmind/palette/actions.ts`, add:

```ts
// Written by CycleDriver (and only it) whenever a range lands on a new whole
// cycling step; all zeros whenever cycling is off.
export const setCycleOffsets = (context: Context, offsets: number[]): void => {
  context.state.palette.cycleOffsets = offsets;
};
```

- [ ] **Step 3: Verify**

Run: `npm test && npm run build`
Expected: both clean — nothing consumes the new state yet, behavior unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/overmind/palette/state.ts src/overmind/palette/actions.ts
git commit -m "Add cycling offsets and display-palette deriveds to palette state"
```

---

### Task 4: Canvas controllers and overlay previews render the display palette

**Files:**
- Modify: `src/canvas/paintingCanvas/PaintingCanvasController.ts` (`updatePalette`, `initPaletteTexture`)
- Modify: `src/canvas/overlayCanvas/OverlayCanvasController.ts` (`updatePalette`, `initPaletteTexture`)
- Modify: `src/canvas/overlayCanvas/program/OverlayGeometricRenderer.ts` (`updateColor`)

**Interfaces:**
- Consumes: `paletteTextureData` from Task 2; `state.palette.displayPalette` from Task 3.
- Produces: both controllers' palette uploads compose rotation from raw state — Task 5's driver only has to call the existing `updatePalette()` methods.

- [ ] **Step 1: Route both controllers' palette uploads through `paletteTextureData`**

In `src/canvas/paintingCanvas/PaintingCanvasController.ts`, add the import:

```ts
import { paletteTextureData } from '../../algorithm/cycle';
```

In `updatePalette()`, replace the `paletteTexture` construction (the `new Uint8Array(256 * 4)` line through the `for` loop) with:

```ts
    // Compose rotation from the raw fields, not the displayPalette derived —
    // this runs inside actions (undo, resize), where deriveds read undefined.
    const { palette, ranges, cycleOffsets } = overmind.state.palette;
    const paletteTexture = paletteTextureData(palette, ranges, cycleOffsets);
```

Apply the identical replacement inside `initPaletteTexture()` (same construction appears there — this is what keeps a GPU-context restore cycled correctly).

In `src/canvas/overlayCanvas/OverlayCanvasController.ts`, apply the same two replacements (its `updatePalette` and `initPaletteTexture` have the same `new Uint8Array(256 * 4)` + loop construction), with the same import.

- [ ] **Step 2: Route overlay geometric previews (line/shape cursor colors) through the display palette**

In `src/canvas/overlayCanvas/program/OverlayGeometricRenderer.ts`, `updateColor` currently resolves an indexed `PaintColor` from `overmind.state.palette.palette`. Change that lookup to the display palette so ephemeral previews match what the committed pixels will show while cycling (this runs from mouse handlers, never inside actions, so the derived is safe here):

```ts
        : overmind.state.palette.displayPalette[String(paintColor.colorNumber)] ?? {
            r: 0,
            g: 0,
            b: 0,
          };
```

- [ ] **Step 3: Verify**

Run: `npm test && npm run build`
Expected: clean. With `cycleOffsets` all zeros, `paletteTextureData` output is byte-identical to the old loop, so nothing changes visually yet.

- [ ] **Step 4: Commit**

```bash
git add src/canvas/paintingCanvas/PaintingCanvasController.ts src/canvas/overlayCanvas/OverlayCanvasController.ts src/canvas/overlayCanvas/program/OverlayGeometricRenderer.ts
git commit -m "Compose the GL palette uploads and overlay previews from the display palette"
```

---

### Task 5: CycleDriver and the toggleCycling action

**Files:**
- Create: `src/canvas/CycleDriver.ts`
- Modify: `src/overmind/palette/actions.ts` (add `toggleCycling`)

**Interfaces:**
- Consumes: `advanceCycleSteps`, `cycleOffsetsOf` (Task 2); `palette.setCycleOffsets` (Task 3); both controllers' `updatePalette()` (Task 4).
- Produces: `cycleDriver.start(): void`, `cycleDriver.stop(): void`, `cycleDriver.withBaseColors(fn: () => Promise<void> | void): Promise<void>` (Task 9 uses this); action `palette.toggleCycling()` (Task 6 binds it to Tab).

- [ ] **Step 1: Create `src/canvas/CycleDriver.ts`**

```ts
import { overmind } from '..';
import { advanceCycleSteps, cycleOffsetsOf } from '../algorithm/cycle';
import { paintingCanvasController } from './paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from './overlayCanvas/OverlayCanvasController';

// Drives color cycling (docs/color-cycling.md): one requestAnimationFrame
// loop advancing per-range fractional step accumulators, and — only when a
// range lands on a new whole step — dispatching the integer offsets to
// Overmind and re-uploading both GL palette textures. Display-only by
// construction: the document palette never changes; stopping just zeroes
// the offsets. Singleton, like the canvas controllers. Lifecycle is owned
// by palette.toggleCycling; state.palette.cyclingOn mirrors it for the UI.
class CycleDriver {
  private rafId: number | null = null;
  private lastTime: number | null = null;
  private accumulators: number[] = [];
  private paused = false;

  start(): void {
    if (this.rafId !== null) {
      return;
    }
    this.lastTime = null;
    this.accumulators = [];
    this.rafId = requestAnimationFrame(this.tick);
  }

  // Stops the loop and resets progress. The caller (toggleCycling) zeroes
  // state.palette.cycleOffsets and refreshes the GL palettes — actions can't
  // be dispatched from inside another action via the overmind instance.
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastTime = null;
    this.accumulators = [];
    this.paused = false;
  }

  // Renders the base (un-rotated) palette for the duration of fn — for save
  // paths that capture the drawing buffer, which would otherwise bake a
  // mid-cycle frame into the file. Cycling resumes from where it paused;
  // the paused wall-clock time is not counted as elapsed.
  async withBaseColors(fn: () => Promise<void> | void): Promise<void> {
    if (this.rafId === null) {
      await fn();
      return;
    }
    this.paused = true;
    this.applyOffsets(overmind.state.palette.ranges.map(() => 0));
    try {
      await fn();
    } finally {
      this.paused = false;
      this.lastTime = null;
    }
  }

  private tick = (now: number): void => {
    this.rafId = requestAnimationFrame(this.tick);
    if (this.paused) {
      return;
    }
    const elapsed = this.lastTime === null ? 0 : now - this.lastTime;
    this.lastTime = now;
    const ranges = overmind.state.palette.ranges;
    if (this.accumulators.length !== ranges.length) {
      this.accumulators = ranges.map(() => 0); // the range list changed under us
    }
    this.accumulators = advanceCycleSteps(this.accumulators, ranges, elapsed);
    const offsets = cycleOffsetsOf(this.accumulators, ranges);
    const current = overmind.state.palette.cycleOffsets;
    if (offsets.length !== current.length || offsets.some((o, i) => o !== current[i])) {
      this.applyOffsets(offsets);
    }
  };

  private applyOffsets(offsets: number[]): void {
    overmind.actions.palette.setCycleOffsets(offsets);
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();
  }
}

export const cycleDriver = new CycleDriver();
```

(The `import { overmind } from '..'` circularity — module → src/index → overmind config → back — is the established pattern; `PaintingCanvasController` does exactly this, and the binding is only dereferenced at call time.)

- [ ] **Step 2: Add `toggleCycling` to `src/overmind/palette/actions.ts`**

Add the imports:

```ts
import { cycleDriver } from '../../canvas/CycleDriver';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
```

Add the action:

```ts
// DPaint's Tab: starts/stops the cycling animation. Off zeroes the offsets
// and repaints, snapping every range back to its base colors.
export const toggleCycling = (context: Context): void => {
  const on = !context.state.palette.cyclingOn;
  context.state.palette.cyclingOn = on;
  if (on) {
    cycleDriver.start();
  } else {
    cycleDriver.stop();
    context.state.palette.cycleOffsets = context.state.palette.ranges.map(() => 0);
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();
  }
};
```

- [ ] **Step 3: Verify**

Run: `npm test && npm run build`
Expected: clean. Nothing calls `toggleCycling` yet.

- [ ] **Step 4: Commit**

```bash
git add src/canvas/CycleDriver.ts src/overmind/palette/actions.ts
git commit -m "Add the CycleDriver rAF loop and the toggleCycling action"
```

---

### Task 6: Tab hotkey

**Files:**
- Modify: `src/components/GlobalHotkeyManager.tsx`

**Interfaces:**
- Consumes: `palette.toggleCycling` (Task 5); the existing `hotkeysSuspended` helper in the same file.

- [ ] **Step 1: Add the hook**

In `src/components/GlobalHotkeyManager.tsx`, add below `useMenuHotkey`:

```ts
// Tab toggles color cycling, like DPaint. preventDefault keeps the browser's
// focus traversal from grabbing the key. Suspended with the other hotkeys
// (dialogs, palette editor, text tool) — cycling already running keeps
// running there; only the toggle is gated.
function useCyclingHotkey(): void {
  const actions = useActions();

  function handleKey(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || hotkeysSuspended(event)) {
      return;
    }
    event.preventDefault();
    actions.palette.toggleCycling();
  }

  useEffect((): void => {
    document.addEventListener('keydown', handleKey);
  }, []);
}
```

and register it in `GlobalHotKeyManager` alongside the others:

```ts
export function GlobalHotKeyManager(): null {
  usePaste();
  useMenuHotkey();
  useCyclingHotkey();
  useBrushTransformHotkeys();

  return null;
}
```

- [ ] **Step 2: Verify in the browser**

Run: `npm start`, open http://localhost:3000. Press **Tab**: the default grey-ramp Range 1 (slots 21–32) starts rotating on any pixels painted with those colors — paint a stroke with a grey first to see it. Tab again stops it and snaps back to base colors. Tab must do nothing while a dialog or the palette editor is open.

- [ ] **Step 3: Commit**

```bash
git add src/components/GlobalHotkeyManager.tsx
git commit -m "Toggle color cycling with Tab"
```

---

### Task 7: Palette strip and FG/BG indicators animate

**Files:**
- Modify: `src/components/palette/ColorButton.tsx:45`
- Modify: `src/components/palette/ColorIndicator.tsx:10,21`

**Interfaces:**
- Consumes: `displayPalette`, `displayForegroundColor`, `displayBackgroundColor` deriveds (Task 3).

- [ ] **Step 1: Point the swatches at the display palette**

In `src/components/palette/ColorButton.tsx:45`, change the swatch color source:

```ts
    backgroundColor: colorToRGBString(useAppState().palette.displayPalette[colorId]),
```

In `src/components/palette/ColorIndicator.tsx`, change the two color sources (`palette.backgroundColor` at line 10, `state.palette.foregroundColor` at line 21) to `palette.displayBackgroundColor` and `state.palette.displayForegroundColor` respectively.

Leave `PaletteEditor.tsx`'s R/G/B/H/S/V slider source (`state.palette.palette[editedColorId]`) and its range-endpoint swatches on the **base** palette — the editor edits base colors; only the embedded swatch grid (which renders through `ColorButton`) animates.

- [ ] **Step 2: Verify in the browser**

`npm start` → press Tab. The toolbox palette's grey-ramp swatches must visibly rotate in place, in step with painted pixels; the FG indicator rotates when the FG color is inside the cycling range. With cycling off, everything is exactly as before. Click a cycling swatch: the FG color set is the **logical** slot (check by stopping cycling — the selected color is the slot's base color).

- [ ] **Step 3: Commit**

```bash
git add src/components/palette/ColorButton.tsx src/components/palette/ColorIndicator.tsx
git commit -m "Animate the palette swatches and FG/BG indicators while cycling"
```

---

### Task 8: Palette editor per-range cycling controls

**Files:**
- Modify: `src/components/paletteEditor/PaletteEditor.tsx`
- Modify: `src/components/paletteEditor/PaletteEditor.css`

**Interfaces:**
- Consumes: `palette.setRangeSettings` (Task 1); `rateToStepsPerSecond`/`stepsPerSecondToRate` (Task 2); the dynamic `rangeOptions` (Task 1); `RetroLabeledSlider` (`label, value, min, max, onChange, vertical?, disabled?`), `RetroToggle` (`options, value, onChange, variant?, disabled?`).

- [ ] **Step 1: Add the controls**

In `src/components/paletteEditor/PaletteEditor.tsx`, add the import:

```ts
import { rateToStepsPerSecond, stepsPerSecondToRate } from '../../algorithm/cycle';
```

Inside the `Range` fieldset, after the existing `palette-editor__range-row` div (endpoints + Clear), add a second row:

```tsx
        {/* Cycling settings ride on the selected range slot: speed shown in
            steps/second (stored as raw CRNG units for lossless IFF
            round-trip), plus DPaint's active and direction flags. */}
        <div className="palette-editor__range-cycling">
          <RetroLabeledSlider
            label="Speed"
            vertical={false}
            value={activeRange ? Math.round(rateToStepsPerSecond(activeRange.rate)) : 0}
            min={0}
            max={60}
            disabled={!activeRange}
            onChange={(value): void => {
              if (activeRangeIndex !== null) {
                actions.palette.setRangeSettings({
                  rangeIndex: activeRangeIndex,
                  rate: stepsPerSecondToRate(value),
                });
              }
            }}
          />
          <RetroToggle
            options={[
              { value: 'on', label: 'Cycle' },
              { value: 'off', label: 'Off' },
            ]}
            value={activeRange?.active ? 'on' : 'off'}
            disabled={!activeRange}
            onChange={(value): void => {
              if (activeRangeIndex !== null) {
                actions.palette.setRangeSettings({
                  rangeIndex: activeRangeIndex,
                  active: value === 'on',
                });
              }
            }}
          />
          <RetroToggle
            options={[
              { value: 'forward', label: 'Fwd' },
              { value: 'reverse', label: 'Rev' },
            ]}
            value={activeRange?.reverse ? 'reverse' : 'forward'}
            disabled={!activeRange}
            onChange={(value): void => {
              if (activeRangeIndex !== null) {
                actions.palette.setRangeSettings({
                  rangeIndex: activeRangeIndex,
                  reverse: value === 'reverse',
                });
              }
            }}
          />
        </div>
```

In `src/components/paletteEditor/PaletteEditor.css`, add (match the file's existing spacing values if they differ):

```css
.palette-editor__range-cycling {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.palette-editor__range-cycling > :first-child {
  flex: 1;
}
```

Known accepted quirk (note, don't "fix"): a loaded rate that isn't a whole steps/second (or exceeds 60) displays rounded/clamped in the slider; the stored raw rate is only rewritten when the user drags the slider.

- [ ] **Step 2: Verify in the browser**

`npm start` → open the palette editor. The Range selector shows six entries. With Range 1 selected: Speed shows 30, Cycle/Off shows Cycle, Fwd/Rev shows Fwd. Start cycling (Tab **before** opening the editor — hotkeys are suspended inside), then open the editor: dragging Speed visibly changes the rotation rate, Off freezes that range, Rev flips its direction. Cancel must revert setting changes (the ranges snapshot already covers the new fields). Selecting a slot with no range greys out all three controls.

- [ ] **Step 3: Commit**

```bash
git add src/components/paletteEditor/PaletteEditor.tsx src/components/paletteEditor/PaletteEditor.css
git commit -m "Add per-range cycling speed, active and direction controls to the palette editor"
```

---

### Task 9: PNG save captures base colors

**Files:**
- Modify: `src/components/menu/Menu.tsx` (`handleImageSave`)

**Interfaces:**
- Consumes: `cycleDriver.withBaseColors` (Task 5); existing `saveCanvasAsPng`.

- [ ] **Step 1: Wrap the capture**

In `src/components/menu/Menu.tsx`, add the import:

```ts
import { cycleDriver } from '../../canvas/CycleDriver';
```

Replace `handleImageSave` with:

```ts
  const handleImageSave = (): void => {
    // The PNG is read straight off the drawing buffer, which would bake a
    // mid-cycle palette rotation into the file — hold the base colors until
    // the capture (which happens after the async save picker) completes.
    void cycleDriver.withBaseColors(async (): Promise<void> => {
      // preserveDrawingBuffer is on, but render once to be sure the buffer is current
      paintingCanvasController.render();
      await saveCanvasAsPng(paintingCanvasController.mainCanvas, 'redpaint.png');
    });
  };
```

(IFF save needs no wrapping — it encodes the base palette and raw indices, never the drawing buffer.)

- [ ] **Step 2: Verify in the browser**

`npm start` → paint with grey-ramp colors, press Tab, and while visibly cycling do Save PNG. The canvas snaps to base colors during the picker and resumes cycling after; the saved PNG shows base colors. Save PNG with cycling off must behave exactly as before.

- [ ] **Step 3: Commit**

```bash
git add src/components/menu/Menu.tsx
git commit -m "Hold base palette colors while capturing the PNG save"
```

---

### Task 10: End-to-end verification and docs

**Files:**
- Modify: `docs/color-cycling.md` (status line)
- Modify: `docs/TODO.md` (tick the item)

**Interfaces:** none — verification and bookkeeping.

- [ ] **Step 1: Full-suite check**

Run: `npm test && npm run build && npm run lint`
Expected: all clean.

- [ ] **Step 2: Verify the cycle direction against a real DPaint image**

This is the check unit tests cannot do (a consistently-wrong sign passes every test). Get a known cycling ILBM — a classic Mark Ferrari scene (e.g. from the "Canvas Cycle" set; the plain-ILBM originals circulate as `.lbm`) or any DPaint image with an obvious waterfall/fire range. Then:

1. `npm start`, Open the IFF, press Tab.
2. Compare the motion direction against the same image in PyDPainter (reference implementation) or a recording of the original.
3. If the motion runs backwards: flip the direction convention in **one** place — swap the `reverse` branch in `cycleOffsetsOf` (`src/algorithm/cycle.ts`) so forward becomes `(span - steps) % span` and reverse becomes `steps` — update the affected `cycleOffsetsOf` test expectations and the direction sentences in `docs/color-cycling.md` and the `cycledPalette` doc comment, and re-run `npm test`.

- [ ] **Step 3: Regression sweep in the browser**

- Undo/redo while cycling: repaints stay rotated; undoing across a palette change keeps cycling coherent.
- Open/close the palette editor while cycling; edit a base color mid-cycle (the edit shows at the slot's cycled position immediately).
- Screen Format: reduce Number of Colors below a range's end — the clamped range keeps cycling within its clamped span or goes quiet if reduced to one slot; no crash.
- Load a plain PNG (no ranges touched), load an IFF with CRNGs (ranges/settings arrive), save IFF, reload — rate/active/reverse and >6 ranges survive.
- Gradient fill and the Cycle/Shade/Blend paint modes behave exactly as before with cycling off.

- [ ] **Step 4: Update the docs**

In `docs/color-cycling.md`, change the status line to:

```
Status: implemented <date of completion>; direction convention verified
against <the reference image/tool used in Step 2>.
```

In `docs/TODO.md`, mark the color cycling item done (`- [x]`) and reduce its text to a pointer at the doc.

- [ ] **Step 5: Commit**

```bash
git add docs/color-cycling.md docs/TODO.md
git commit -m "Mark color cycling implemented in the docs"
```
