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

`docs/keyboard.md` has this right. The DP2 Handbuch (4-36) confirms both keys
survived into II: "g - Raster ein; SHIFT&G - Raster ein und Schnappen auf
Pinselposition".

**The source is DPaint I** (`docs/dpaint-versions.md`), so it is evidence for
what II inherited, not for what II is. Where the manual and the source disagree
the manual wins, and on the requester below they do.

**The spacing requester, and Adjust.** Right-clicking the gadget opens the Grid
requester: X-spacing and Y-spacing as typed numbers in pixels, OK and Cancel
(DP2 Handbuch 2-9, Abbildung 2.1). Beside them is **Adjust**, which closes the
requester and hands you the canvas with a live grid matrix under the cursor —
drag with the button held and release when the cells are the size and shape you
want, or move it and click to reposition the grid's points without resizing
(2-10, 4-36).

Adjust is the interaction the vendored DPaint I source calls `IM_gridSpec`
(`MODES.C:298-343`): a 4×4 patch of grid drawn in XOR under the pointer, the
first click setting the origin, the drag sizing the cell as `(mx - grXorg)/4`,
with the coordinate readout repurposed to show the origin and then the spacing.
In DPaint I that modal drag is the *only* way to set the spacing; DPaint II put
a numeric requester in front of it and kept the drag behind a button.
**We follow DPaint II**: the requester is the way in, matching every other
toolbox right-click (`SymmetrySettings`, `FontSettings`, `FillStyleSettings`),
and Adjust is the second phase.

In Perspective mode the same requester grows a Z spacing, a From Brush button
setting X and Y to the current brush's dimensions, and the brush's rotation
angle per axis (4-36). That belongs to Perspective, not here.

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
Seventeen gadgets do not tile two columns. Either an eighteenth gadget earns
its place, or the block stops being a clean 2xN.

**A. A colour picker gadget.** Recommended. It fills the cell with the thing
this toolbox is most obviously missing rather than with the thing DPaint
happened to put there.

The pick tool already exists (`ColorSelectorTool`, DPaint's `IM_readPix`) and
is the least discoverable thing in the app: two 20-pixel click targets inside
the colour indicator, and a `,` key nobody guesses. Every editor a user has
met puts an eyedropper in the toolbar, and it is a selector tool, so it fits
the gadget vocabulary already there beside brush-select and magnify. It is a
second door onto a tool we ship, not a new tool, which is why it costs parity
almost nothing even though DPaint II has no such gadget.

That gives:

| Row | redpaint, with Grid |
|-----|---------------------|
| 6 | brush select, text |
| 7 | **grid**, symmetry |
| 8 | magnify, **colour picker** |
| 9 | undo, clr |

Grid lands exactly where DPaint had it, undo/clr — the pairing muscle memory
finds fastest — is untouched, and the new row is coherent on its own terms:
both of its gadgets arm a mode, wait for one canvas click, and disarm.

**B. Colour cycling.** The other genuine candidate, and a bigger feature than
the picker. It loses on the same test that wins it for the picker: cycling
already has a labelled gadget with its shortcut printed on it in the Picture
drawer, and `Tab`, which is DPaint's own key. The picker has neither — no
labelled control anywhere in the app, and a `,` key with nothing to suggest it.
The free cell should go to the thing with no door, not to the thing with two.

It is also the odd one out in that block by kind. Every gadget there either
selects a drawing tool, arms a mode that changes what a canvas click does, or
acts (undo, clr). Cycling animates the palette and paints nothing; if it wants
a second door, the palette strip directly below it is the truer place for one.

Not a closed question, though — see "what comes after eighteen".

**C. Restore the zoom-in/out gadget.** DPaint's own 18, every gadget where it
put them. But it duplicates the zoom pane's `+`/`-` and Alt+wheel, and it is
dead weight whenever the zoom pane is closed, which is most of the time. Faithful
and not useful.

**D. Leave the eighteenth cell empty.** A hole in a 2xN block of gadgets reads
as a bug rather than as a decision.

**E. Re-pair the bottom rows** so seventeen fit with one row of one. Every
pairing below row 6 moves, undo/clr included.

**F. Span a cell across both columns.** The container is
`grid-template-columns: 40px 1px 40px`, and `BuiltInBrushes` above and
`ColorIndicator` below are already full-width, so the idiom exists in the
sidebar — but not inside the gadget block, and a double-width gadget reads as
more important than its neighbours rather than as a space-filler.

### One pick mode or two

Worth settling with the gadget, because the gadget has to be one or the other.

DPaint has **one** PICK mode: clicking the colour indicator (or `,`) arms it,
and then the button used *on the canvas* decides — left picks a foreground
colour, right a background one (DP2 Handbuch 4-38, `CTRPAN.C:403-405`).

We have **two** modes, `foregroundColorSelectorTool` and
`backgroundColorSelectorTool`, chosen by which part of the colour indicator was
clicked, with the canvas click always meaning the one already chosen. That is
what makes the indicator two small targets with no visible difference in
meaning, and it is the discoverability problem as much as the missing gadget
is.

**Decided: collapse to DPaint's single mode.** One cell cannot carry two arming
gestures without inventing an upper/lower split for something DPaint splits by
canvas button instead, and the two-mode split is the indicator's
discoverability problem as much as the missing gadget is. So:
`foregroundColorSelectorTool` and `backgroundColorSelectorTool` become one
`colorSelectorTool`; on the canvas, left-click sets the foreground and
right-click the background. Both halves of the colour indicator then arm the
same one mode, as DPaint's does. This deletes state rather than adding it.

The background stays palette-indexed either way — it doubles as the clear
colour and the brush transparency marker — so a right-click on a true-colour
pixel goes on doing nothing.

`onContextMenu` currently only calls `preventDefault`, so the right-click path
is free. `colorIndicatorHint` and `docs/keyboard.md` both describe the two-mode
behaviour and need updating with it.

Under A, two icons need drawing: one new `<symbol>` pair in
`src/resources/toolbar.svg` for Grid and one for the picker, following the
sheet's convention — 26.458-unit viewBox, a `-view` and a `-active-view` entry,
`<use>` placement 30 units apart. DPaint's own grid icon is a 3×3 lattice of
lines, which reads at 26 units and is what the gadget should be. The picker is
an eyedropper everywhere it appears; there is no reason to be clever.

### This is the only time this decision gets made

**The DPaint toolbox never changed.** II, III, IV and V ship the same eighteen
gadgets in the same nine rows, down to the pairing. The DP4 manual's Toolbox
index and DP5's figure 8.1 both list left column dotted freehand, straight line, fill,
rectangle, ellipse, brush selector, **grid**, **magnify**, undo — right column
continuous freehand, curve, airbrush, circle, polygon, text, **symmetry**,
**zoom**, clear. That is `CTRPAN.C`'s order exactly, twelve years and three
major versions later. Everything those versions added — Stencil, perspective,
gradients, textures, animation, ARexx — arrived on menus and requesters.

So there is no later version to defer to, and no second cell coming. Stencil,
Fix/Free Background and Perspective are all on the backlog and none of them is
a toolbox gadget in DPaint, so none will ask for one. This cell is the whole
budget, now and permanently, which argues for spending it on the highest-value
thing rather than the most faithful one — the faithful choice being a gadget
whose two functions the app already offers twice over.

Colour cycling stays the runner-up on that reasoning, not a reservation.

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
2. **Gadget and requester.** The toolbox slot per option A above, both icons,
   right-click to the requester, and the requester itself: X and Y spacing as
   typed numbers, the drawn-grid toggle, OK/Cancel, and **Adjust**.
3. **Drawn grid.** The DOM layer, the visibility floor, and the zoom pane.
   Before Adjust, which needs a grid to show: Adjust is a selector tool
   (`ZoomInitialPointSelectorTool` is the closest existing shape) that draws
   the grid live while the pointer sizes it.
4. **ExclBrush** (`docs/TODO.md:198`), which is gated on Grid: with the grid
   on, brush pickup drops the right and bottom edge so a pattern tiled from the
   brush keeps a single-width border rather than a doubled one.

DPaint I's Adjust set the origin on the first click and the spacing on the
drag. DPaint II's does one or the other per invocation — drag to resize, or
move and click to reposition. The second is the one to build.

## Not to be confused with

**Perspective's grid** (`docs/dpaint2-parity.md:41`) is a different feature
that happens to share the word: a 3D ground plane with its own spacing and
movement keys. It is a separate backlog item and shares no code with this one.

**The palette grid** (`docs/palette-grid-marks.md`) is the swatch layout in the
sidebar. Unrelated.
