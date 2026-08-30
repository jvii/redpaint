# Spacing

DPaint's **Spacing** requester: how far apart the brush stamps land along a
line, curve or unfilled shape, turning a continuous stroke into a dotted one.
Not built. This note is what the manuals and the source actually say, and what
it costs us — which is more than the backlog entries assumed, in one specific
place.

## What DPaint did

**DPaint II** (Handbuch 2-24 Abb. 2.5, 4-32). Right-clicking the **straight
line** or the **curve** gadget opens it. Three controls:

- **Absolute** — the number is pixels between the centres of consecutive
  splats.
- **Relative** — the number is how many splats the whole line gets. "Specify a
  relative spacing of 10 and your line, curved or straight, consists of 10
  splats."
- **On / Off** — spacing applies or it does not.

**It also governs the unfilled shape tools** — rectangle, circle, ellipse,
polygon — "although right-clicking those icons does not bring up the Spacing
dialog" (2-24). Those gadgets open the Fill Type requester instead, so in
DPaint II the setting reaches them but the door does not.

**DPaint III** fixed exactly that: "a right-button click on any of these tools"
— straight line, curve, *and the unfilled shapes* — "brings up the Spacing
requester" (DP3 4-60). It also renamed the two modes to what they mean and
added a third option:

| DPaint II | DPaint III |
|-----------|------------|
| Relative | **N Total** — total splats along the path |
| Absolute | **Every Nth dot** — pixels between splats |
| — | **Airbrush** — spray the airbrush N times at each point along the path |

Airbrush spacing is a III feature and out of scope here, but it is a good
reminder of what the setting is: not a line style, but a *rule for choosing
which points along a path get a brush stamp*.

**Not the dotted freehand tool.** Its spacing is the speed you move the mouse,
in II (4-31) and still in III (9-3179). Both of our backlog entries name the
dotted freehand as the tool this requester belongs to; both are wrong, and one
of them also says command-click where DPaint says right-click.

**Nothing in the DPaint I source.** Like the Grid requester, Spacing arrived in
II, so `MODES.C`'s `IMVect`/`IMCurve` draw solid lines with no thinning
anywhere. The manuals are the only reference.

## Why it was cheap there and is not here

Very cheap, and the reason is one architectural difference.

Every DPaint primitive comes in a `...With` form that takes a **function and
calls it once per pixel, in path order**: `PLineWith` (`GEOM.C:20`),
`PCircWith` (`GEOM.C:103`), `PEllpsWith` and `PCurve` (`CONIC.C:193, 160`).
`Conic` (`CONIC.C:106`) is a general conic tracer that walks the curve one step
at a time, rolling `curoct` through the octants as it goes, calling `(*func)(x,y)`
at each. Drawing a solid line is `PLineWith(..., CurPWritePix)`; drawing into
the magnified view is the same call with `SplatOp()` instead (`MAGOPS.C:64-104`).

Against that, spacing is **a counter inside the proc**. Stamp on every Nth
call, ignore the rest. No array, no ordering question, no allocation, and every
tool that draws through a `...With` gets it at once. That is why a feature
touching six tools could appear in a point release.

We return `Point[]` from the shape functions instead. That is a deliberate
trade and mostly the better one here — it is what makes `src/algorithm/` pure
and fixture-testable, and WebGL wants a batch of points per draw call, not a
callback per pixel. What it gives up is exactly the guarantee spacing needs,
because a rasterizer that is only ever going to fill or outline has no reason
to emit in path order, and two of ours do not.

**DPaint had half the same problem.** `PCircWith` only takes the traced path
when pixels are non-square, where it defers to `PEllpsWith` and `Conic`. On
square pixels it uses `PCircOct` + `octpts` (`GEOM.C:76, 90`), which generates
one octant and mirrors each point into eight — the same octant scatter as our
`unfilledCircle`, arrived at the same way and for the same reason. Whether
DPaint II's spacing produced a scattered circle on Lo-Res, or whether it
re-routed through `Conic`, is not answerable from the DPaint I source. So this
is not somewhere we are doing worse than the original; it is a problem the
original either shared or solved out of sight.

**And the trade is not one-directional.** A streaming proc cannot know how long
the path is until it has walked it, so DPaint's *N Total* mode needs a counting
pass before the drawing pass. With the whole path already in an array, N Total
is `points.length / n` and costs nothing. Each architecture makes one of the two
modes free.

## Where it hooks in

Every unfilled primitive in both brushes has the same shape:

```
shape function → Point[] (or Line[]) → stampOrPoints / stamp
```

`PixelBrush.drawLine` is `line(start, end)` then stamp; `CustomBrush.drawLine`
is the same with a handle offset. So spacing is a **filter on the point
sequence**, and any primitive it applies to collapses to a `drawPoints` call:

```
SpacingBrush.drawLine(a, b, canvas)
  → inner.drawPoints(thin(line(a, b)), canvas)
```

That is a `BrushInterface` decorator, the same shape as `SymmetryBrush`
(`docs/symmetry-tool.md`), and it composes with it in one order:
`symmetryBrush(spacingBrush(realBrush))`. Symmetry transforms the control
points and re-draws the shape per copy, so each copy gets its own path thinned
independently — which is what DPaint does, since spacing is applied by the
drawing proc that symmetry calls once per copy.

Filled shapes and the freehand tools do not participate, so they are simply not
overridden: the decorator passes them to the inner brush untouched.

## The part that is not free

**Two of our shape functions do not emit points in path order**, and thinning
by index needs them to.

| Function | Order | Usable as-is |
|----------|-------|--------------|
| `line` | along the line | yes |
| `curve` | segments concatenated in `t` order | yes |
| `unfilledPolygon` | `line()` per edge, in order | yes |
| `unfilledRect` | four `LineH`/`LineV`, not a path | needs joining |
| `unfilledCircle` | **octant order** | no |
| `unfilledEllipse` | **column scan, then row scan** | no |

`unfilledCircle` is a midpoint rasterizer emitting eight points per iteration,
one per octant (`shape.ts:143`). Thinning that list by index does not give
evenly spaced dots around a circle; it gives an eight-armed scatter.
`unfilledEllipse` is worse — two independent scans, one per axis, with points
appearing twice (`shape.ts:226`).

Neither is a bug. Both are drawing a continuous outline, where the order pixels
are emitted in cannot matter. It only starts to matter when something wants to
walk the outline.

### How PyDPainter solves it

PyDPainter (`libs/prim.py`) is worth reading here, because it took our
architecture — arrays of coordinates, not a callback per pixel — and hit
exactly this problem.

Its thinning is a `CoordList.draw` pre-pass (`prim.py:1284-1338`), and it is
what you would guess:

```python
if spacing == DrawMode.EVERY_N:
    coords = coordsall[::every_n_value]
elif spacing == DrawMode.N_TOTAL:
    for i in range(n_total_value):
        coords.append(coordsall[(numpoints-1) * i // (n_total_value-1)])
```

A stride for Every Nth, an index interpolation for N Total. Both need the array
in path order, and the interesting part is how `drawcircle` gets it
(`prim.py:1729-1770`). It is the same midpoint algorithm as ours, emitting the
same eight mirrored points per iteration — but into **eight separate lists, one
per octant**, appending to the even ones and *prepending* to the odd ones:

```python
cl = CoordList(8)
cl.append (0, (x0 + y, y0 + x));  cl.prepend(1, (x0 + x, y0 + y))
cl.append (2, (x0 - x, y0 + y));  cl.prepend(3, (x0 - y, y0 + x))
cl.append (4, (x0 - y, y0 - x));  cl.prepend(5, (x0 - x, y0 - y))
cl.append (6, (x0 + x, y0 - y));  cl.prepend(7, (x0 + y, y0 - x))
```

Concatenating lists 0 through 7 (`prim.py:1266-1269`) then walks the circle
once around, continuously: the prepends are what reverse every other octant so
its end meets the next one's start. Same loop, same arithmetic, same cost —
eight buckets instead of one, and the traversal order falls out.

**That is the fix to take**, in preference to anything below. It is O(n) with no
sort and no dedupe, it is exact rather than approximate, and it drops into our
existing `unfilledCircle` loop, which already emits its eight points in one
place (`shape.ts:165-173`). For the ellipse, PyDPainter sidesteps the question
entirely: `drawellipse` builds the outline from twelve Bezier segments
(`calc_ellipse_curves`), each rasterized by `drawcurve`, so it is in path order
by construction — a bigger change for us than the circle, but the same idea.

The alternatives, now only worth recording:

- **Sort by angle about the centre**, spacing path only. Works, but it is a
  sort and a dedupe to recover an order the loop could simply have produced.
- **Resample parametrically** — N points at even *arc length* rather than even
  pixel index. Arguably truer for N Total, since a Bresenham circle emits more
  pixels per unit arc in the shallow octants, so index-thinning bunches the
  dots there. But neither DPaint nor PyDPainter does it, and matching DPaint is
  the objective.

**On the rectangle, PyDPainter has the bug.** `drawrect` delegates to
`drawpoly`, which calls `drawline` once per edge (`prim.py:3050`), and each
call runs its own thinning pass — so the dot phase restarts at every corner. A
spaced rectangle there has four independent dotted edges rather than one dotted
perimeter. Ours should concatenate the four segments before thinning, which is
what the `CoordList(8)`/`CoordList(12)` shape is for and what `drawrect` skips.

## The gadget gestures are free

Nothing currently claims the right-click we need:

- **Line** and **curve** are `ToolboxToggleButton`s with only an `onClick`.
- The unfilled halves of the four dual-toggle shape gadgets have no right-click
  either — `ToolboxDualToggleButton` supports `onLowerHalfRightClick`, which
  the filled halves use for Fill Style, and an `onRightClick` for the whole
  gadget, but there is no upper-half hook yet. One needs adding, symmetric with
  the lower one.

**Follow DPaint III and open the requester from the unfilled halves too.**
DPaint II's own arrangement — the setting governs unfilled shapes but only the
line and curve gadgets can reach it — is not a design, it is a gap that the
next version closed. Our gadgets already split unfilled from filled along
exactly the line that decides which requester applies, so the fix costs one
hook and reads as obvious.

## State

Three values — mode (`total` | `everyNth`), the number, and on/off — belonging
to the whole app rather than to a tool, since DPaint's one setting governs six
tools at once. `overmind/tool/state.ts` is per-tool transient interaction state
and this is neither, so it wants a small module of its own beside `fillStyle`,
which is the closest existing parallel: a shared drawing setting reached by
right-clicking several gadgets.

The default must be off, and "off" has to mean the current continuous
behaviour exactly — not spacing 1, which would route today's drawing through
the thinning path for no reason.

## Shape of the change

### New files

| File | ~Lines | What |
|------|--------|------|
| `src/algorithm/spacing.ts` | 40 | `thin(points, mode, n)`. Pure arithmetic. |
| `test/algorithm/spacing.test.ts` | 60 | Both modes, the edge cases (n larger than the path, a one-point path). |
| `src/brush/SpacingBrush.ts` | 130 | The decorator. Six methods thin, six pass through. |
| `src/overmind/spacing/{state,actions,index}.ts` | 60 | Mode, number, on/off, settings open/snapshot. Modelled on `overmind/fillStyle`. |
| `src/components/spacing/SpacingSettings.{tsx,css}` | 150 | The requester. `SymmetrySettings` (84 + 47 lines) is the closest size and shape. |

### Files touched

- `src/algorithm/shape.ts` — path order for `unfilledCircle` and
  `unfilledEllipse`, plus a perimeter join for `unfilledRect`. **The only risky
  part; see below.**
- `src/brush/SymmetryBrush.ts` — one line, at the singleton: the inner brush
  becomes the spacing brush rather than `brushRecall.current`.
- `src/components/toolbox/Toolbox.tsx` — six right-click handlers: line, curve,
  and the unfilled half of rectangle, circle, ellipse, polygon.
- `src/components/toolbox/buttons/ToolboxDualToggleButton.tsx` — an
  `onUpperHalfRightClick`, symmetric with the `onLowerHalfRightClick` the filled
  halves already use. Five lines.
- `src/components/toolbox/toolboxHints.ts` — a `rightClick` line on those six.
- `src/components/App.tsx`, `src/overmind/index.ts` — mount the dialog, register
  the module.
- `test/algorithm/shape.test.ts` — path-order assertions (consecutive points
  adjacent, no duplicates).
- `docs/TODO.md`, `docs/dpaint2-parity.md` — tick it off.

Roughly 450 new lines and ten files touched, most of them one-liners.

### What is already true and does not need doing

- **`drawPoints` is behaviour-preserving.** Both brushes route every unfilled
  primitive through the same `stampOrPoints` / `stamp`, effect-draw branch
  included (`PixelBrush.tsx:122`, `CustomBrush.tsx:232`). So collapsing a
  primitive into a `drawPoints` call keeps Smooth, Shade, Blend and the rest
  working with no special case.
- **The handle commutes.** `CustomBrush.adjustHandle` is an integer translation
  (`CustomBrush.tsx:227`), so thinning before it and thinning after it give the
  same pixels — the decorator can hand raw points down and let the brush offset
  them.
- **Previews come free.** Tools already draw their overlay through the same
  brush, so a spaced line previews spaced without a line of extra code.
- **Symmetry composes.** `SymmetryBrush` takes its inner brush from a thunk, so
  inserting a decorator underneath it is a change to one expression.

### The risk is in one place

`unfilledCircle` is cheap — PyDPainter's octant buckets, about fifteen lines
changed in a loop that already emits the eight points together.

`unfilledEllipse` is the awkward one. It is two axis scans producing duplicate
points, so there is no bucket trick; either sort by parametric angle in the
ellipse's own frame and dedupe, or rebuild it the way PyDPainter does, out of
Bezier segments. Both are more than a tweak, and both move a rasterizer that
the shape fixtures pin, so expect to regenerate and eyeball those PNGs.

### Which is why it splits

**Phase 1 — line, curve, rectangle, polygon.** All four are already in path
order or (the rectangle) one trivial join away. Everything above except the
`shape.ts` row: no rasterizer moves, no fixture regenerates, no risk. Around
350 lines, and it is four of the six tools.

**Phase 2 — circle and ellipse.** The circle is a small win; the ellipse is the
real work. Deferrable indefinitely, and visibly incomplete in the meantime,
which is the argument against splitting.

## What to build

1. **The thinning**, in `src/algorithm/spacing.ts` — pure, a `Point[]` in and
   a `Point[]` out, with the two modes. Tested directly; it is arithmetic, not
   pixels, so it needs no fixtures.
2. **Path order for circle and ellipse**, per option 1 above, with its own
   tests asserting that consecutive points are adjacent.
3. **`SpacingBrush`**, the decorator, wired inside `symmetryBrush`.
4. **The requester and the gadget right-clicks**, following
   `FillStyleSettings` — it is the same kind of dialog opened the same way from
   the same gadgets.

Airbrush spacing (DPaint III) is not part of this and would attach at step 3 if
it were ever wanted.
