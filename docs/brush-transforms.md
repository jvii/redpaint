# Brush Transformations

A re-implementation of Deluxe Paint's **Brush menu** transforms: reshaping the
current custom brush — flip, rotate, resize, shear — without touching the
canvas.

## What DPaint had

The Brush menu (DPaint I `MENU.C:187`, described in the DPaint II manual §4.15)
grouped the transforms as:

| Group  | Item              | Key       | Interaction |
| ------ | ----------------- | --------- | ----------- |
| Size   | Stretch           | `Shift-Z` | drag        |
| Size   | Halve             | `h`       | instant     |
| Size   | Double            | `Shift-H` | instant     |
| Size   | Double Horiz      | `Shift-X` | instant     |
| Size   | Double Vert       | `Shift-Y` | instant     |
| Flip   | Horiz             | `x`       | instant     |
| Flip   | Vert              | `y`       | instant     |
| Rotate | 90 Degrees        | `z`       | instant     |
| Rotate | Any Angle         |           | drag        |
| Rotate | Shear             |           | drag        |
| Bend   | Horiz / Vert      |           | drag        |

(Change Color's Bg→Fg / Remap also lived in this menu but are color
operations, not geometry — out of scope here.)

Two interaction models:

- **Instant** transforms apply to the brush bitmap the moment the menu item /
  key is hit. The brush cursor immediately shows the new shape.
- **Interactive** transforms enter a modal drag: the brush outline on canvas
  reshapes as the mouse moves, and button release commits the new brush. Esc
  (or picking another tool) reverts.

## Reference: original DPaint source

Vendored under `docs/reference/dpaint-source/src/` (see also the DPaint II
manual text in `docs/reference/dpaint2-manual/`):

- `BRXFORM.C` — `BrFlipX`/`BrFlipY` (row/column reversal) and the
  **original-brush snapshot** machinery: `SaveBrush(newxf)` copies the brush to
  `origBr` before a transform kind is entered, `RestoreBrush()` reverts to it.
- `ROT90.C` — `BMRot90`, a planar-bitmap transpose; swaps width/height and
  remaps the handle (`xoffs/yoffs`).
- `STRETCH.C` — interactive resize; each drag frame resamples **from
  `origBr`** at the new size (nearest-neighbor row/column sampling).
- `SHEAR.C` — `BMShearX`: each row blitted with a horizontal offset advanced
  by a Bresenham-style error term (`sum += dx; while (sum > h) x += xinc`),
  top row anchored, output widened by `|dx|` so nothing clips.
- `BEND.C` — like shear but the per-row offset follows a curve instead of a
  line.

**Key findings from the original:**

1. **Interactive transforms never compound.** Every drag frame re-derives the
   result from the `origBr` snapshot, so there is no accumulating resampling
   error. Selecting Rotate Any Angle a second time first reverts to the
   original. `Shift-B` restored the pre-transform brush at any time.
2. **Lossless instant transforms are applied to both** `curbr` and `origBr`
   (see `BrFlipX`), so a flip survives a later revert; lossy ones (Halve)
   reset the snapshot.
3. Transforms only ever applied to a **custom brush** (`curpen == USERBRUSH`);
   built-in brushes were unaffected.
4. All transforms are pure pixel-index reshuffles on the brush bitmap — no
   rendering machinery involved.

## Architecture in dxpaint

### Layer 1 — pure algorithms (`src/algorithm/brushTransform.ts`)

Transforms are pure functions `BrushColorIndex → BrushColorIndex` (the RGBA
`Uint8Array` with palette index in R and the indexed/truecolor tag in alpha —
transforms move whole 4-byte pixels, so they are automatically true-color
safe):

```ts
flipHorizontal(b: BrushColorIndex): BrushColorIndex
flipVertical(b: BrushColorIndex): BrushColorIndex
rotate90(b: BrushColorIndex): BrushColorIndex        // CW; swaps w/h
rotate(b: BrushColorIndex, degrees: number): BrushColorIndex
resize(b: BrushColorIndex, w: number, h: number): BrushColorIndex
shearHorizontal(b: BrushColorIndex, dx: number): BrushColorIndex
```

- `resize` is nearest-neighbor (pixel-art: no filtering), so Halve/Double/
  Double-Horiz/Double-Vert are just `resize` with computed dimensions.
- `rotate(degrees)` rasterizes by **inverse mapping**: for each destination
  pixel, rotate back into source space and sample nearest — no holes.
  Non-multiples of 90° enlarge the bounding box; uncovered pixels get alpha 0
  (transparent).
- `shearHorizontal` ports `BMShearX` directly: integer error-term row offsets,
  output width grows by `|dx|`. A vertical variant is the same transposed
  (DPaint I's own `BMShearY` was never finished; the menu only exposed
  horizontal shear under Rotate).
- Watch the Y-flip: `BrushColorIndex` rows are stored bottom-up (GL
  convention). Flip/shear "up/down" semantics must account for it — exactly
  the kind of off-by-one the fixture tests exist to catch.

This layer gets tests in `test/algorithm/brushTransform.test.ts` using the
PNG-fixture workflow (`test/pixelGrid.ts` + `test/shapeFixture.ts`), plus
property checks that need no fixture: `flip∘flip = id`, `rotate90⁴ = id`,
`double∘halve = id` for even sizes.

### Layer 2 — CustomBrush integration

`CustomBrush` already keeps a base bitmap plus derived Matte/FG/BG-colorized
variants and a `lastChanged` timestamp that tells renderers to re-upload the
brush texture. A transform:

1. applies the pure function to the **matte** (source-of-truth) index,
2. re-derives the colorized variants (re-run `setFGColor`/`setBGColor` for the
   current palette colors),
3. updates `width`/`heigth`,
4. bumps `lastChanged`.

Rather than mutating in place, `transform(fn)` returns a **new `CustomBrush`**
pushed via `brushRecall.set(...)` — that keeps `lastChanged`-based texture
caching trivially correct and gives brush history for free.

**Handle:** dxpaint always stamps center-anchored (`CustomBrush.tsx:178`), so
DPaint's handle bookkeeping (flip/rot90 remapping `xoffs/yoffs`) disappears:
the center is invariant under flips and rot90, and resized/rotated brushes
just re-center. A real win from the simpler model.

**Original snapshot:** `brushRecall.originalBrush`, captured when a custom
brush is first transformed (`setTransformed`), with a reactive mirror
`state.brush.hasOriginalBrush` for the menu item's disabled state. Semantics:

- interactive transforms (Phase C) re-derive from it every frame;
- capturing/loading/selecting any brush clears it (`brushRecall.set`);
- a **Restore** menu item / `Shift-B` swaps it back in — disabled outright
  on a built-in brush (there's nothing to undo there; DPaint's Shift-B also
  re-activated the last custom brush from a built-in detour, `UserBr`, but
  that's the Previous slot's job now, docs/brush-slots.md).
- **Deviation from DPaint:** DPaint applied flips to the snapshot too, so its
  revert kept them. Here Restore undoes *every* transform, returning to the
  brush as captured/loaded — the easier rule to predict, and a flip is one
  keypress to redo.

### Layer 3 — Overmind actions (`src/overmind/brush/actions.ts`)

One action per instant transform (`flipBrushHorizontal`, `rotateBrush90`,
`halveBrush`, …). Each guards like DPaint did: no-op unless
`brushRecall.current instanceof CustomBrush` **and** it is not a built-in
(`!isBuiltInBrush(...)`). Built-in brushes are never transformed — same as
DPaint (`curpen == USERBRUSH` guard); the menu items and hotkeys are inert
while one is selected, and the menu items render disabled.

Interactive transforms get transient drag state in the `tool` module
(`state.tool.brushTransformTool`: kind, drag start, live params), following
the existing per-tool state pattern.

### Layer 4 — UI

**Phase 1 ships with the existing menu.** The dropdown's Brush column
(`Menubar.tsx:314`) gains the instant transforms under its Open…/Save… items:

```
Brush
  Open...
  Save...
  ─────
  Flip Horiz      x
  Flip Vert       y
  Rotate 90°      z
  Halve           h
  Double          H
  Restore         B
```

Items disabled when a built-in brush is active (same `usingBuiltInBrush` flag
the Matte item uses). `MenuItem` needs a small extension to render a trailing
shortcut hint.

**Later — compact widget row.** The menu is one panel, not DPaint's cascading
menus, and 6+ text rows is a lot of vertical space for one-shot verbs. The
likely end state is a row of **icon buttons in the style of the menu status
widget** (`screen-status__segment` / the stretch toggle in `Menubar.tsx:293`):
a segmented strip of small glyphs (⇋ ⇅ ⟳ ½ 2× …) plus a live brush preview
thumbnail, either in the menu's status strip or in the Brush column header.
Menus may get a broader redesign at some point — the doc deliberately doesn't
commit; layers 1–3 are UI-agnostic and survive any of it.

**Keyboard shortcuts** go in `GlobalHotkeyManager.tsx` beside the spacebar
menu toggle, reusing `hotkeysSuspended()`. DPaint's keys, case-sensitive:
`x`/`y` flip, `z` rotate 90°, `h` halve, `Shift-H` double, `Shift-X`/`Shift-Y`
double one axis, `Shift-B` restore. (None collide with existing bindings —
today only space is taken.)

### Interactive transforms (Stretch / Rotate Any / Shear)

A modal drag on the canvas, DPaint-style:

- Entering the mode stores `kind` in `state.tool.brushTransformTool` and
  captures the original snapshot.
- While dragging, each mouse-move computes the transform params from the drag
  vector (Stretch: new w/h from the delta, Shift constrains aspect; Rotate:
  angle about the anchor corner; Shear: `dx` from horizontal delta), applies
  the pure function **to the snapshot**, and shows the result as the live
  brush-cursor preview on the overlay canvas — the existing
  `OverlayDrawImageRenderer` path renders whatever the current brush is, so a
  cheap first cut is to actually swap the transformed brush in on every frame
  (`lastChanged` makes the texture re-upload just work). If per-frame
  reallocation is too slow for large brushes, an outline-only preview is the
  fallback.
- Mouse-up commits; Esc / mode exit calls restore.
- Mode indication (all reusable per armed selector tool): the menubar mode
  slot shows the transform's name in accent color, the pointer becomes the
  matching resize cursor, and the preview is wrapped in the color-inverting
  marquee box. For the record: DPaint 2 showed no box during its Stretch —
  its only cue was the pointer changing to the text "SIZE". The box is
  better, so it stays a deliberate deviation.

### Explicitly deferred

- **Perspective** — a whole subsystem in DPaint (own keypad UI, 3-axis state);
  out of scope.

## Phases

- **Phase A — instant transforms.** ✅ Done. `brushTransform.ts` (flip H/V,
  rotate90, resize) + tests; `CustomBrush.transform()`; Overmind actions; menu
  items; hotkeys. Includes Halve/Double/Double-H/Double-V via `resize`.
- **Phase B — snapshot & restore.** ✅ Done. `originalBrush` capture, Restore
  item, `Shift-B` (restores to as-captured; see the deviation note above).
- **Phase C — interactive Stretch and Shear.** ✅ Done. Both ride the
  selector-tool slot (armed via menu item / `Z` for Stretch, `S` for Shear,
  Esc disarms — one shared `toggleBrushTransformMode`); the drags preview
  temporary brushes on the overlay (`current.transform(...)` each frame — the
  real brush is untouched until release, so cancel needs no restore) and
  commit through `stretchBrushTo`/`shearBrushBy`, reusing the snapshot
  machinery so Restore/`Shift-B` undoes them. Shear is horizontal-only, like
  DPaint's (its `BMShearY` was never finished either). Rotate Any Angle
  (`R`) is done too, on the same rails, with two deliberate upgrades over
  DPaint: it rotates about the brush center (not the pinned bottom-left
  corner) matching the center-anchored stamps, and it previews the actual
  rotated bitmap live (not an XOR outline), with a live angle readout in the
  menubar mode slot and Shift snapping to 15° steps.
- **Phase D — Bend.** ✅ Done. `bendOffsets`/`bendHorizontal`/`bendVertical`
  port BMBendH/V: rows (or columns) shift along a quadratic Bezier whose one
  moving control the pointer's region picks, DPaint-style — past the near end
  bends that end, past the far, the other, between them the middle bulge
  rides the pointer (its position placing the bulge). The drag previews the
  actual bent bitmap plus its curved outline via `selectionPolygon` (DPaint
  showed only the XOR curves). Menu-only + Esc, like the original (it had no
  bend keys). The transform items also moved into their own **Transform**
  menu column at this point — the Brush column had outgrown short windows.
- **Phase E — icon-button menu redesign.** ✅ Done ("status rail + Brush
  drawer", concept gallery in the menu-concepts artifact). The four-column
  text panel is gone: the menu's status row became a rail carrying image disk
  I/O (WB1.3 floppy gadgets), a Brush gadget, and the mode selector as a
  compact 4x2 RetroToggle (every mode one click, the pressed segment is the
  mode display; Matte/Repl per-segment disabled for built-ins). The Brush
  gadget toggles a drawer with brush disk I/O and the transforms as pixel-icon
  gadget clusters under the Size/Flip/Rotate/Bend heads. Pixel icons are
  ASCII-map-rendered SVGs (`pixelIcons.tsx`); gadgets share one 64px row
  height (`MenuGadgets.tsx`); hotkeys unchanged, hints moved into gadget
  tooltips.
