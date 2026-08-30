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

Three ways out, in order of preference:

1. **Sort by angle about the centre, for the spacing path only.** A circle's
   points and an ellipse's both have an exact parametric angle, so this is a
   sort plus a dedupe on a few hundred points — nothing, at these sizes. The
   existing rasterizers and their PNG fixtures do not move.
2. **Rewrite the two rasterizers to emit in path order.** Cleaner in the
   abstract, and it means regenerating the shape fixtures and re-checking every
   caller that assumed nothing about order.
3. **Resample the shape parametrically** instead of thinning the rasterized
   list — N points at even *arc length* rather than even pixel-index. Arguably
   more correct for N Total, since a Bresenham circle emits more pixels per unit
   arc in the shallow octants, so index-thinning bunches the dots there. But it
   is not what DPaint did, and matching DPaint is the objective.

`unfilledRect` needs its four segments concatenated into one perimeter in
corner order, so the phase carries around the corners rather than restarting at
each. Cheap, and worth a note in the code, since the natural implementation of
"apply spacing to a `Line[]`" is per-line and silently wrong.

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
