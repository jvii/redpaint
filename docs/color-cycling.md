# Color Cycling — design

Status: implemented 2026-07-22; direction convention verified against the
canvascycle project's bundled TESTRAMP reference data (a faithful
reimplementation of Amiga CRNG semantics). Animating each palette range's
colors over time, independent of painting — DPaint's Tab cycling. Distinct
from the Cycle _paint mode_ (which steps the active range per stamp and is
already implemented); the two share the `PaletteRange` model and nothing else.

## User-visible behavior

- **Tab toggles cycling** on/off, unconditionally — deliberately _not_ gated
  by `hotkeysSuspended()` in `GlobalHotkeyManager` like the other canvas
  hotkeys are. Toggling from inside the palette editor (to preview a range
  while tuning it) is the point, and cycling is display-only (see below), so
  there is nothing it can corrupt regardless of what has focus.
- Each range cycles independently, controlled by three new per-range
  properties: **rate** (speed), **active** (does this range participate when
  cycling is on), **reverse** (direction). Edited in the palette editor's
  Range fieldset: a speed slider presented as **steps/second (0–60)** plus
  Active and Reverse toggles.
- The range list is no longer capped at four. CRNG is a repeatable chunk and
  real files carry more than four ranges (Mark Ferrari-style cycling scenes
  especially) — the ILBM plan's future-work note called this out
  (docs/superpowers/plans/2026-07-19-ilbm-load-save.md, "Color cycling
  playback"). The palette editor offers **six slots by default** — more
  headroom than DPaint's four for authoring scenes with several
  independently cycling elements — and loading a file with more usable
  CRNGs grows the list beyond that; the range selector shows them all.
- The **palette strip and FG/BG indicators animate** along with the canvas,
  driven by the same rotation offsets — direct feedback for tuning ranges.
- **IFF CRNG round-trip**: `rate`/`active`/`reverse` survive load and save
  instead of being dropped on load and hardcoded on save as today.

## Core decision: display-only rotation

On the Amiga, cycling rotated the hardware palette registers — the natural
(free) implementation, not a deliberate semantic. Since every canvas pixel
stores only an index, painted strokes cycle automatically _whichever layer the
rotation lives in_. So redpaint rotates colors _at display time only_: the
document palette in Overmind never changes while cycling runs.

What this buys, compared to rotating `state.palette` DPaint-style:

- The color picker and palette strip pick **logical** colors — slots don't
  slide under the cursor mid-cycle.
- Save/export always sees the base palette; no "saved the file mid-cycle and
  baked a rotated palette" hazard.
- Everything computing from palette state (gradient fill, remap operations)
  sees a stable palette.
- No Overmind/React churn at animation rate for the document state, and undo
  (which snapshots pixels only) is untouched by construction.

Nothing of the paint-while-it-cycles feel is lost: a stroke painted with
index N shows the cycling color of N, exactly as on the Amiga.

## Architecture

Rotation is composed in JS and re-uploaded as the 256×1 palette texture —
the mechanism `updatePalette()` already implements. A cycle step costs a 1 KB
`texImage2D` plus one full-canvas render (same as any paint stroke), at most
60×/second and only while cycling. No shader changes: every renderer that
samples the palette texture (main, zoom mirror, overlay brush preview) picks
up the cycled colors automatically.

The alternative — remapping indices in the shaders via range-bounds + offset
uniforms — was rejected: it touches every palette-sampling program (~5) and
adds per-frame uniform plumbing to avoid a trivial 1 KB upload.

**The overlay animates too** (a DPaint touch: the brush cursor and any
in-progress shape preview cycle live, not just committed pixels). The overlay
is immediate-mode — drawn once per mouse event, never on a render loop — so
re-uploading its palette texture alone doesn't repaint what's already on
screen. `OverlayCanvasController` remembers every color-bearing draw call
(`points`/`lines`/`quad`/`drawImage` — not the selection-indicator calls,
which sample the main canvas and invert, independent of the palette) made
since `beginFrame()` was last called, and `CycleDriver` replays all of them
every tick after the texture upload, and once more when cycling stops (so the
preview snaps back to base color instead of freezing on its last cycled
frame). A single call isn't enough to remember: a solid-color preview is one
draw, but a gradient-filled shape preview is one call _per color band_
(`fillStyleDraw.ts` buckets by color) — replaying only the last would leave
every band but one frozen. `Canvas.tsx` calls `beginFrame()` right before
dispatching each `*Overlay` tool handler, so one mouse event's draws
accumulate together and the next event starts a fresh list instead of
growing forever. The replay itself is cheap: it's the same tiny draws the
mouse event already paid for, not a new render pass — the point/line/quad
path resolves color from `displayPalette` at call time, and `drawImage`
already samples the palette texture by index, so both just pick up whatever
CycleDriver most recently uploaded.

Data flow:

```
CycleDriver (rAF singleton, alongside the canvas controllers)
  └─ per-range accumulators advance by rate; when an integer offset changes:
       overmind.actions.palette.setCycleOffsets(offsets)   ← 4 ints, on change only
         ├─ derived state.palette.displayPalette
         │    = cycledPalette(base palette, ranges, offsets)
         ├─ effect → paintingCanvasController.updatePalette()
         │           + overlayCanvasController.updatePalette()
         │   (updatePalette reads displayPalette instead of paletteArray)
         └─ palette strip / FG-BG swatches re-render from displayPalette
```

New Overmind state (`palette` module): `cyclingOn: boolean` and
`cycleOffsets: number[]` (same length as `ranges`, all zero when off).
Toggling cycling off zeroes the offsets, which recomposes and re-renders the
base palette.

### Pure core (`src/algorithm/cycle.ts`)

Next to the existing `cycleColorIndex`:

- `cycledPalette(base, ranges, offsets)` — rotate each active range's span by
  its offset. Each range reads from the _base_ palette and ranges apply in
  slot order 1→N, so on overlap the later slot wins. Spans of length ≤ 1 and
  inactive/null ranges are no-ops.
- `advanceCycle(accumulators, ranges, elapsedMs)` — advances fractional step
  accumulators at the CRNG rate (`16384 = 60 steps/s`) and returns the new
  accumulators plus integer offsets (`floor(acc) mod span`, sign flipped for
  reverse). Pure, time injected, fully testable.

`CycleDriver` stays thin: start/stop on the `cyclingOn` flag, one
`requestAnimationFrame` loop, calls the pure functions, dispatches
`setCycleOffsets` only when an integer offset actually changed (at typical
DPaint rates most frames change nothing).

### Direction convention

The palette _registers_ rotate the other way from what the displayed slots
show: a forward cycle physically shifts each register's value from `start`
toward `end` (wrapping `end` back to `start`), so what a fixed slot `i`
_displays_ is the base color that used to sit `k` positions _behind_ it.
Offset math (`cycleOffsetsOf`): displayed color of slot `i` in a
forward-cycling range `[s..e]` at raw step count `k` is base color of
`s + ((i − s − k) mod span)` — implemented as offset `(span − k mod span) mod
span` fed into `cycledPalette`'s `s + ((i − s + offset) mod span)`. Reverse
uses `k mod span` directly (the registers shift the other way).

Verified against the [canvascycle](https://github.com/jhuckaby/canvascycle)
project's bundled `TESTRAMP.LBM.json` test data (a from-scratch
reimplementation of Amiga CRNG semantics, `reverse: 0`/forward): tracing its
`shiftColors` register rotation by hand confirmed the sign above. The initial
implementation had this backwards — the classic cycling bug, and exactly why
unit tests alone can't catch a wrong convention, only an inconsistent one.

## Data model and file format

`PaletteRange` grows from `{start, end}` to:

```ts
type PaletteRange = {
  start: string; // 1-based color id, as today
  end: string;
  rate: number; // raw CRNG units, 0..16384 (16384 = 60 steps/s)
  active: boolean; // participates when cycling is on
  reverse: boolean;
};
```

`rate` stays in raw CRNG units for lossless IFF round-trip; the UI converts
to steps/second only for display (`rate / 16384 * 60`). Defaults for
user-created ranges (and the built-in grey-ramp Range 1): `rate: 8192`
(30 steps/s — the value the save path already hardcodes today),
`active: true`, `reverse: false`.

`state.palette.ranges` becomes variable-length: `(PaletteRange | null)[]`
with a **minimum of six slots** (padded with `null`), no upper cap. The
palette editor's range selector lists every slot; clearing an extra slot
above the first six prunes it. All existing consumers (`activeRangeIndices`,
the gradient-fill range picker, Shade/Blend/Cycle paint modes, the ILBM save
`flatMap`) already iterate the array and are length-agnostic. Save keeps
writing **only the non-null slots** as CRNG chunks (the existing `flatMap`
behavior): an image authored with three ranges round-trips as three CRNGs,
not six — don't "fix" this into DPaint's always-four emulation.

File format changes:

- `cycleRangesToPaletteRanges` keeps its `low < high` filter but **drops the
  `.slice(0, 4)` cap** — every usable CRNG becomes a range slot — and
  preserves `rate`/`active`/`reverse`. A loaded CRNG with `rate > 0` but
  the active bit clear becomes an inactive range — kept, editable, silent
  until activated (matching DPaint files that ship gradient-only ranges).
- The ILBM save path in `Menu.tsx` writes each range's own
  `rate`/`active`/`reverse` instead of the current hardcoded
  `{rate: 8192, active: true, reverse: false}`.

## Interactions and edge cases

- **Undo/redo**: the repaint path already calls `updatePalette()`, which now
  composes through `displayPalette`, so rotation survives undo automatically.
  Undo never snapshots palette data, so cycling cannot pollute history.
- **PNG save** captures the drawing buffer (`preserveDrawingBuffer: true`),
  which would bake a mid-cycle frame into the file. The save path re-renders
  with offsets zeroed, captures, then restores — a `withBaseColors(fn)`
  helper on the driver. IFF save is immune (it writes the base palette and
  raw indices, never the drawing buffer).
- **Palette edits mid-cycle**: the editor's existing `updatePalette()` calls
  now pick up the display composition, so an edited slot shows its cycled
  position immediately; the base edit lands in `state.palette` as today.
- **GPU context restore**: `restoreContext()` re-uploads via
  `initPaletteTexture()`, which should also read `displayPalette` (or the
  driver's next tick corrects it one frame later).
- **Screen format / resolution changes** already funnel through paths calling
  `updatePalette()`. If the palette shrinks below a range's endpoints, the
  existing range-clamping behavior applies; a clamped span of ≤ 1 simply
  stops moving.
- **Safari**: each step costs one full composite (the `preserveDrawingBuffer`
  tax noted in TODO's performance section). Palette-only re-render is already
  the minimal possible repaint for a global palette change, so dirty-rect
  work neither helps nor is needed here.

## Testing

All in the pure layer, per repo convention (`test/` mirrors `src/`):

- `test/algorithm/cycle.test.ts`: `cycledPalette` — forward/reverse rotation,
  overlap precedence, span-1 and inactive no-ops, wholesale offset-0
  identity; `advanceCycle` — rate→steps timing with injected elapsed time,
  fractional accumulation, wrap-around, reverse sign.
- CRNG↔`PaletteRange` mapping round-trip (rate/active/reverse preservation,
  more than six ranges surviving load, minimum-six `null` padding)
  alongside the existing `paletteRange`/ilbm tests.

`CycleDriver` (rAF plumbing) and the palette-editor UI stay untested, like
the rest of the UI layer.

## Out of scope

- Animation export (GIF/APNG of the cycle).
- Rates above 60 steps/s.
- DPaint's later ping-pong/"flash" modes — standard CRNG cannot encode
  ping-pong; DRNG/CCRT chunks are a possible future note.
- Any change to the Cycle paint mode.
