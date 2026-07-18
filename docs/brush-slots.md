# Brush Recall & Slots

How getting a previous brush back should work: the automatic layer (what the
app remembers for you) and the deliberate layer (brush slots you curate).
Companion to docs/brush-transforms.md, which owns the transform snapshot.

## Where this starts from

`brushHistory` (`src/brush/BrushHistory.ts`) currently keeps:

- `current` — the active brush;
- `originalBrush` — the pre-transform snapshot for Restore / `Shift-B`;
- `history` — an array every `set()`/`setTransformed()` pushes onto that
  **nothing ever reads**. Since transforms push each intermediate step, it
  accumulates full-bitmap snapshots ("the state between two flips") without
  bound. It is memory ballast, not a feature.

## Reference: what DPaint did

DPaint had exactly **one** custom brush, plus the internal pre-transform
original. There was no unsaved-brush storage feature. What it had instead:

- **`Shift-B` = `UserBr()`** (`CHPROC.C:185`, "use last brush selected") —
  re-activates the custom brush after you've been on a built-in. Because the
  untransformed original was kept internally, the DPaint II manual (§4.16)
  also documents it as the way to get the pre-Halve/pre-transform brush back.
- **The spare page** (`j` swaps two full screens): the actual stash idiom.
  Artists stamped brushes onto the spare screen as a scratch board and
  re-grabbed them with the brush selector. Slots existed socially, not as a
  feature. (Later pixel tools — Pro Motion, Grafx2 — formalized exactly this
  into multi-slot brush containers.)

**Design stance:** history answers "give me back what I just had" and is only
valuable shallow — automatic, but noisy (accidental captures, transform
steps) and unpresentable as UI beyond a step or two. Slots answer "I'll want
this again" — deliberate, bounded, visual, muscle-memory friendly. Build
slots as the feature; keep the automatic layer tiny and named.

## Phase A — slim the automatic layer

`BrushHistory` becomes named single references, no array:

- `current` — as now.
- `originalBrush` — as now, **but no longer dropped when a built-in brush is
  selected** — only when a *new custom* brush arrives (capture/load/slot
  recall). This makes the recall chain below composable.
- `lastCustomBrush` — the most recent custom (captured/loaded) brush, kept
  while built-ins are in use. Updated whenever the current brush is a custom
  one; cleared never (there is always at most one, it just goes stale when
  replaced).
- `history` array: **deleted**.

`Shift-B` / the Restore item then walk one chain, DPaint-style:

1. On a built-in brush → re-activate `lastCustomBrush` (in whatever
   transformed state it was left; `selectedBuiltInBrushId` goes null, mode
   rules as in brush load).
2. On a custom brush with a snapshot → restore `originalBrush` (as today).
3. Otherwise → no-op.

So from a built-in, `Shift-B` gets your brush back, and `Shift-B` again
un-transforms it — each press one step, both presses cheap to undo (the
built-ins are one click away). The menu item's label can stay "Restore"; its
disabled state becomes "chain has no step to take"
(`hasOriginalBrush || (usingBuiltInBrush && hasLastCustomBrush)` mirrored in
Overmind state).

## Phase B — brush slots

A fixed row of **8 slots**, each holding one unsaved `CustomBrush`.

- **Model:** `brushSlots: (CustomBrush | null)[]` module-level alongside
  `brushHistory` (class instances stay out of Overmind state; a reactive
  mirror carries what the UI needs — per-slot occupied flag + a thumbnail
  data-URL + a version stamp).
- **Actions:** `storeBrushInSlot(i)` (current brush; no-op for built-ins),
  `recallBrushFromSlot(i)` (activates a *copy* — transforming a recalled
  brush must not mutate the stored one), `clearSlot(i)`.
- **UI:** a thumbnail strip in the menu panel, in the `screen-status__segment`
  visual style (this is where the icon-button/status-widget direction from
  brush-transforms.md lands first). Slots are visual by nature — a text menu
  cannot show which brush is which. Interactions: click an occupied slot to
  recall; store/clear via right-click or a small store button; empty slots
  show a dimmed placeholder. Thumbnails render via `CustomBrush.toImageData`
  scaled into a fixed box (nearest-neighbor, letterboxed).
- **Keyboard:** deferred until the strip exists — digit keys are attractive
  but likely wanted for palette/tool shortcuts; decide with real usage.

## Phase C (maybe) — persistence

Slots surviving reload would out-do DPaint (its stash died with the session
unless saved to disk). `localStorage` with the matte `BrushColorIndex`
serialized (width/height + base64 index array). Two things to respect:

- **Palette-indexed pixels are palette-relative.** A slot restored into a
  session with a different palette recolors accordingly — same behavior as
  the live brush on palette edits, so arguably correct; note it, don't fight
  it.
- **Size:** 8 slots × a full-canvas RGBA brush can reach tens of MB;
  localStorage caps around 5. Either cap what persists (skip slots over ~256²)
  or move to IndexedDB. Decide when it hurts.

## Explicitly not doing

- **History as selectable UI** — a recency wall of near-duplicate bitmaps;
  demos well, never used. The slim chain above covers the real "oops" cases.
- **Spare page** — the true DPaint stash. Worth building someday for its own
  sake (scratch canvas, compositing, `j` swap), at which point it also
  becomes a free-form brush stash again. Tracked as an idea, not part of
  this.

## Phases

- **Phase A — recall chain.** ✅ Done. `lastCustomBrush`, snapshot survives
  built-in detours, `Shift-B`/Restore walks the chain, `history` array
  deleted (`BrushHistory` now has intent-named setters: `setCustom`,
  `setBuiltIn`, `setTransformed`, `reactivateLastCustom`).
- **Phase B — slots.** Model + actions + thumbnail strip in the menu.
- **Phase C (maybe) — persistence** once slots prove out.
