# Grid

DPaint II's **Grid**: a toggle that snaps drawing coordinates to a lattice,
8×8 by default. Not built yet. This is the design note that decides how, and
settles the two questions the feature raises that its DPaint original does not
answer for us — where the toolbox gadget goes, and whether the grid is drawn.

## What DPaint did

All of it is about forty lines of `PAINTW.C` and `MODES.C`.

**The state** (`PAINTW.C:42-48`) is five numbers: `gridx`/`gridy` (8, 8),
`gridOrgX`/`gridOrgY` (0, 0), and `gridON`. `gridx2`/`gridy2` are the halves,
precomputed for the rounding.

**The snap** is `Gridify(x, y)` (`PAINTW.C:75-84`), applied to the raw pointer
position before anything else sees it:

```c
rx = *x - gridOrgX + gridx2;
if (rx < 0) rx -= gridx;
*x = gridOrgX + (rx/gridx)*gridx;
```

Subtract the origin, add half a cell, integer-divide, multiply back, add the
origin. Adding the half cell is what makes it round to the *nearest* line
rather than truncating to the one below. The `if (rx < 0)` is because C
truncates toward zero, which rounds the wrong way left of the origin — an
implementation detail of C division, not a design decision, and a language
with a floor division does not need it.

**Which tools snap** is a per-tool opt-out, not a global (`PAINTW.C:305`):

```c
gridded = ((curIMFlags & NOGR) == 0);
```

`NOGR` is set on freehand, fill, airbrush, and every brush transform — the
tools where a snapped pointer would either do nothing useful or actively fight
the user. Everything else snaps: line, curve, rectangle, circle, oval,
polygon, text, brush pickup.

**Two keys, not one** (`CHPROC.C:195-196`):

- `g` → `TogGridSt()`. Toggles, nothing else. The brush jumps to the nearest
  grid point on the next move.
- `G` → `TogGridFixed()` (`CHPROC.C:117-126`). Toggles, then shifts the origin
  by the difference between where the pointer is and where it would snap to,
  so the held brush does not move. The grid arrives *under* the cursor.

`docs/keyboard.md` has this right. `docs/dpaint2-parity.md` and `docs/TODO.md`
describe the origin shift as if it were what `g` does; they need correcting
either way.

**The spacing requester is not a requester.** Right-clicking the gadget enters
`IM_gridSpec` (`MODES.C:298-343`), a modal drawing interaction: the first click
sets the origin, the drag sizes the cell, and a 4×4 patch of grid is drawn in
XOR under the pointer the whole time, live. Spacing comes out as
`(mx - grXorg)/4` — you drag out four cells and it divides. The coordinate
readout is repurposed to show the origin, then the spacing.

That is a lovely interaction and it is also the only place in DPaint where
setting a number is done by dragging it out on the canvas. We have a requester
idiom (`SymmetrySettings`, `FontSettings`, `FillStyleSettings`) that every
other right-click in the toolbox uses, and it is the one a user of this app
will expect. **Recommendation: a normal requester**, with the drag-it-out
interaction noted here as a possible extra rather than the only way in. It
would be worth building later precisely because it is charming, not because it
is needed.

## Where the gadget goes

The real problem, and worth deciding before any code.

DPaint's toolbox is 18 gadgets in 9 rows of 2 (`CTRPAN.C:229-247`). Ours is 16
in 8 rows, and it is DPaint's list **minus two**: Grid, and the zoom-in/out
gadget (`case 15: MWZoom(±1)`). Their absence is why our rows still line up —
we dropped both and pulled the magnifier up a row to fill the gap:

| Row | DPaint | redpaint |
|-----|--------|----------|
| 6 | brush select, text | brush select, text |
| 7 | **grid**, symmetry | magnify, symmetry |
| 8 | magnify, **zoom in/out** | undo, clr |
| 9 | undo, clear | — |

So Grid does not need a new slot invented for it. It needs its own slot back,
which displaces the magnifier back down, which re-opens the zoom-in/out hole.
Seventeen gadgets do not tile two columns. The options:

**A. Restore the zoom-in/out gadget too.** Back to DPaint's 18, every gadget
where DPaint put it, no layout question left. The cost is that it duplicates
controls the zoom pane already carries — `ZoomCanvas.tsx` has its own `+`/`−`
buttons and Alt+wheel, which is why it was left out. A duplicate that matches
the original is not the worst thing in a program whose point is being that
program, and the toolbox gadget works before the zoom pane is open, where the
pane's own buttons do not exist yet. *This is the recommendation.*

**B. Leave the eighteenth cell empty.** Honest about the omission, and a hole
in a 2×9 block of gadgets reads as a bug rather than as a decision.

**C. Re-pair the bottom rows** so seventeen fit with one row of one. Every
pairing below row 6 changes, including undo/clr, which is the one pairing users
build muscle memory on fastest.

**D. Span a cell across both columns.** The container is
`grid-template-columns: 40px 1px 40px`, and `BuiltInBrushes` above and
`ColorIndicator` below are already full-width, so the idiom exists in the
sidebar. But it does not exist *inside* the gadget block, and a double-width
gadget would read as more important than its neighbours rather than as a
space-filler.

**E. Fold zoom-in/out into the magnifier gadget** as its right-click (right =
zoom out, or right-click opens a magnification requester). Keeps 18 cells' worth
of function in 17 — except it does not, it keeps it in 16 plus Grid, which is
the tiling problem again. Only helps combined with B.

Under A, the icon needs drawing: one new `<symbol>` pair in
`src/resources/toolbar.svg` for Grid (plus one for zoom-in/out), following the
sheet's convention — 26.458-unit viewBox, a `-view` and a `-active-view` entry,
`<use>` placement 30 units apart. DPaint's own grid icon is a 3×3 lattice of
lines; that reads at 26 units and is what the gadget should be.

## Drawing the grid

DPaint never drew one outside the spacing interaction. Nothing stops us, and
every modern pixel editor does:

- **Aseprite** — `View > Grid`, separate from snapping, plus a *second*
  independent "Pixel Grid" at 1×1. Colour and opacity are preferences. Both
  hide automatically below a zoom threshold.
- **Krita** — a grid docker with type, spacing, subdivisions and opacity, drawn
  above the image.
- **Photoshop** — `View > Show > Grid`, spacing and subdivisions in
  Preferences, and snapping is a separate menu item under `View > Snap To`.

The consistent lesson: **the drawn grid and the snap grid are two toggles, not
one.** People want snapping without the visual noise, and want the guide
without the snap. Aseprite's automatic hide below a zoom threshold is the other
lesson, and it matters more here than there — see the floor below.

### Where to draw it

**Not the overlay WebGL canvas.** Two independent reasons. It is cleared and
redrawn by every tool handler (`beginFrame()` per mouse event), so a persistent
grid would have to be re-issued on every mouse move by every tool. And it is an
indexed-colour surface: a grid line would have to *be* a palette colour, so it
would be invisible against any artwork using that colour, and it would change
appearance when the palette is edited.

**A DOM layer, inside `.canvas-stack`.** The wrapper that centres the canvas
already exists and already shrink-wraps it exactly, so a sibling of the two
canvases with `position: absolute; inset: 0; pointer-events: none` is aligned
to the artwork for free, and stays aligned when the canvas is centred, scrolled
or rescaled. It is the same place and the same technique `CropOverlay` uses.

Two ways to paint it:

1. **CSS `repeating-linear-gradient`**, sized in CSS pixels as
   `spacing × displayScale` per axis. Zero JavaScript per frame, no redraw
   cost, and it follows a scale change automatically if the scale is a CSS
   custom property. Fractional scales put the lines on fractional pixels, where
   the browser antialiases them into a soft grey — acceptable for chrome (it is
   not artwork), but it will not be crisp at every scale.
2. **A 2D canvas** of its own, redrawn on scale/spacing/size change only. Full
   control — dashed lines, exact device-pixel snapping, a heavier line every N
   cells — at the cost of a third canvas element and a redraw path. This is
   what to reach for if (1) looks muddy in practice.

Start with (1). It is a dozen lines, and it settles the question of whether the
crispness matters by showing it.

### The visibility floor

An 8-pixel grid at `displayScale` 1 draws a line every 8 screen pixels. On a
retina display at Native the scale is `1/dpr` = 0.5, so the same grid is a line
every 4 CSS pixels — solid noise, not a guide. The drawn grid needs a minimum
on-screen cell size (roughly 8 CSS pixels, to be judged on screen) below which
it does not render at all, exactly as Aseprite's zoom threshold does. Snapping
is unaffected; only the drawing hides.

The zoom pane is the opposite case and the one where a grid earns its keep
most: at 6× magnification an 8×8 grid is a line every 48 pixels, which is a
genuine drawing aid. The pane's canvas gets the same `.canvas-stack` wrapper,
so the same layer works there with only the scale differing.

## Snapping architecture

Every tool reads the pointer through `getMousePos(event)`
(`src/tools/util/util.tsx:4`) — about 75 call sites across 21 tools. That is
the choke point, and the same one DPaint used: `Gridify` was applied centrally
and tools opted out with a flag.

**Recommendation: snap in `getMousePos`, with a per-tool opt-out**, mirroring
`NOGR`. Concretely, a `snapsToGrid: boolean` (defaulting true) on the `Tool`
interface, read from `overmind.state.toolbox.activeTool`, with freehand,
dotted freehand, airbrush, flood fill and the brush transforms setting it
false. One place to get right, and adding a tool later cannot silently forget
to snap.

Two cautions:

- `canvasPixelUnder` in `Canvas.tsx` feeds the **coordinate readout** and is a
  separate path. It should show the snapped coordinate when the grid is on —
  that is the feedback that tells you the grid is working — but it must go on
  clamping to the canvas, which snapping can push it outside of.
- The **grid origin** is per-document state, not a preference: it moves when
  `G` toggles the grid under the cursor, and a picture loaded from a file has
  no meaningful origin of its own. It belongs next to the other per-document
  view state in the `canvas` module, alongside the spacing.

A decorator on `Tool` (the shape `SymmetryBrush` takes at the brush layer) was
considered and is the wrong level here: symmetry transforms *geometry after
rasterization decisions*, which is why it has to sit at the brush layer, where
a grid transforms *one input point before anything happens to it*. There is
nothing to re-rasterize, so there is nothing for a decorator to buy.

## Phasing

1. **Snap.** `Gridify` in `src/algorithm/grid.ts` (pure, testable, fixtures
   unnecessary — it is arithmetic), the opt-out flag, state in `canvas`, the
   `g`/`G` keys, and the coordinate readout showing snapped values. No gadget
   yet; the keys are enough to use and to test.
2. **Gadget.** The toolbox slot per option A above, both icons, right-click to
   the spacing requester, and the requester itself (spacing X/Y, origin,
   and the drawn-grid toggle).
3. **Drawn grid.** The DOM layer, the visibility floor, and the zoom pane.
4. **ExclBrush** (`docs/TODO.md:198`), which is gated on Grid: with the grid
   on, brush pickup drops the right and bottom edge so a pattern tiled from the
   brush keeps a single-width border rather than a doubled one.

The drag-out spacing interaction from `IM_gridSpec` is a possible fifth step
and belongs in the backlog, not the plan.

## Not to be confused with

**Perspective's grid** (`docs/dpaint2-parity.md:41`) is a different feature
that happens to share the word: a 3D ground plane with its own spacing and
movement keys. It is a separate backlog item and shares no code with this one.

**The palette grid** (`docs/palette-grid-marks.md`) is the swatch layout in the
sidebar. Unrelated.
