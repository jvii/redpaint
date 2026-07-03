# Symmetry Tool

A re-implementation of Amiga Deluxe Paint's **Symmetry** mode: a real-time
kaleidoscope that mirrors/rotates every drawn stroke around a center point.

## What it does

When symmetry is on, each stroke is duplicated into **N** rotational copies
(cyclic mode) or **2N** copies (mirror mode) evenly spaced around a center
point — an N-fold rotational (dihedral, with mirror) symmetry.

Parameters (defaults match DPaint's `DPINIT.C`: `SymSet(6, YES, center)`):

- **center** `(cx, cy)` — pivot; defaults to the canvas center.
- **order** `n` — number of rotational copies, `1..40` (default 6).
- **mirror** — reflect each rotated copy across the vertical axis (default on;
  `2n` copies total).

## Reference: original DPaint

Ported from the historical DPaint I source
([historicalsource/DeluxePaint](https://github.com/historicalsource/DeluxePaint)).
The key routines:

- `PSYM.C` — `SymDo(np, pts, proc)` transforms the `np` **control points** of a
  shape around the center (and reflects them under mirror), then calls `proc` to
  **re-draw** the shape from the transformed points. Our `symmetryCopies()` is
  the equivalent transform generator.
- `MODES.C` — the per-tool draw procs, called once per symmetry copy:
  - Freehand is `incline() { mLine(lx,ly,mx,my); }` — each move draws a **line
    segment** from the previous point; symmetry transforms the two endpoints and
    re-rasterizes, so mirrored strokes are gap-free.
  - Rectangle/oval use `ConstBoxFromSM` → `BoxTwoPts`, which builds an
    **axis-aligned** box from two corner points. So under symmetry the corners
    are kaleidoscoped but the box **stays axis-aligned** (it does not rotate).
  - Circle is `mCircle(sx,sy, RadSM())` — center + radius, rotation-invariant.
- `PAINTW.C` — the `imodes` table flags each tool `NOSYM` / `SYMUP` / `SYMDN`
  (which tools participate, and whether copies appear live or on release).

**The important finding:** DPaint transformed each shape's *defining
points/anchors* and **re-rasterized**, rather than rotating already-rasterized
pixels. That is why rotated strokes have no gaps, and why point-defined shapes
(line/curve/polygon) follow the rotation while box-defined shapes
(rect/oval/circle) stay axis-aligned.

**One intentional deviation:** DPaint transformed *both* rectangle corners and
rebuilt the axis-aligned bounding box, which makes the aspect ratio vary with
the angle (a horizontal box near the top, a tall box at the side). That looks
broken, so we instead transform the rectangle's **center** and keep its exact
size — every copy is congruent, matching the circle/ellipse behavior.

## Architecture

Symmetry lives at the **brush layer** as a `BrushInterface` decorator,
`SymmetryBrush` (`src/brush/SymmetryBrush.ts`). For each stroke it transforms
the geometric arguments per symmetry copy and re-invokes the *wrapped* brush,
so every copy is re-rasterized natively (no gaps).

```
Tool → symmetryBrush.drawX(...geometry, rawController)
         └── for each copy: innerBrush.drawX(transform(geometry), buffer)
               └── buffer records points/lines/quads/stamps
         └── buffer.replayTo(rawController)   // one batched call per type
```

To keep the single-draw-call performance of point batching, each copy is drawn
into a **`DrawCallBuffer`** (`src/brush/DrawCallBuffer.ts`) — a `DrawTarget`
that records draw calls instead of issuing them, then replays everything to the
real controller in one call per primitive type. So we get clean re-rasterized
copies *and* batching.

### Why the brush layer (not a CanvasController decorator)

An earlier attempt put symmetry in a `CanvasController` decorator that rotated
the already-rasterized points. That is elegant and batchable, but it sits
*below* rasterization, so rotating a rasterized 1px line and re-rounding drops
pixels → **visible gaps**. Re-rasterizing at the brush layer (like DPaint) is
the only way to get gap-free rotated lines. The `DrawCallBuffer` recovers the
batching that the brush-layer approach would otherwise lose.

Brushes draw into the **`DrawTarget`** interface (the draw-command subset of
`CanvasController`) rather than a full controller — the real controllers
implement it, and so does the buffer, without pretending to own canvases.

### Per-primitive behavior (faithful to DPaint)

| Primitive | Under symmetry |
|-----------|----------------|
| Freehand | draws a line segment per move (`incline`); endpoints transformed, re-rasterized → connected |
| Line, curve, polygon | point-defined → transformed points, re-rasterized → **they rotate** |
| Rectangle, ellipse, circle | **center** transformed, shape kept axis-aligned & **congruent** (same size) → they do **not** rotate |
| Flood fill | **independent** fills from each transformed seed (see below) |

### Flood fill is special

A flood fill cannot be a rotated copy of the fill region, because the underlying
image is not symmetric. `FloodFillTool` transforms the **seed point** to each
symmetry position and runs an **independent real flood fill** from each (skipping
seeds that rotate off-canvas). The fills run sequentially on the same mutating
color index, so overlapping regions are handled like DPaint, and the union is
drawn once.

## State

- `toolbox.symmetryModeOn` (existing) — the enable flag, toggled by the existing
  toolbox button (analogous to `zoomModeOn`).
- `overmind/symmetry` — the parameters: `center: Point | null` (null → canvas
  center), `order`, `mirror`, with `setCenter` / `setOrder` / `setMirror` /
  `resetCenter`. A derived field, `symmetry.activeSettings`, computes the
  effective `SymmetrySettings | null` (null when the mode is off or the canvas
  is unsized; center defaulted) — this is what the brush, flood fill, and the
  overlay indicator read.

## Files

| File | Role |
|------|------|
| `src/algorithm/symmetry.ts` | Pure `symmetryCopies(settings)` / `symmetryTransforms(settings)` — the point transforms (copy 0 = identity). |
| `src/brush/SymmetryBrush.ts` | The `BrushInterface` decorator + the `symmetryBrush` singleton. |
| `src/brush/DrawCallBuffer.ts` | A `DrawTarget` that records draw calls, then replays them batched. |
| `src/overmind/symmetry/{state,actions,index}.ts` | Center / order / mirror state. |

Tools draw through `symmetryBrush` against the **raw** controllers (the brush
applies symmetry, so the controller must be raw to avoid double-applying).

## Implementation status

- [x] **Phase 1 & 2 — all drawing tools.** Freehand, DottedFreehand, Airbrush,
  Line, Curve, Rectangle, Circle, Ellipse, Polygon route through
  `symmetryBrush`; FloodFill does independent seeded fills. Text and all selector
  tools stay raw (`NOSYM`). Real paint and overlay previews both mirrored; shape
  tools keep a single origin crosshair (raw overlay). Undo reverts a whole
  symmetric stroke in one step.
- [x] **Symmetry position indicator.** For tools whose overlay preview cannot
  show the brush (filled rect/circle/ellipse pre-origin, flood fill hover),
  `drawSymmetryIndicator` (`src/tools/util/symmetryIndicator.ts`) draws a
  foreground-color point at every symmetry position — the analog of DPaint's
  `SymShowOb` XOR feedback in `PAINTW.C`. Flood fill skips the primary position
  so the indicator never covers the pixel color being targeted (DPaint instead
  switched to a dedicated fill pointer, `FILLCURSOR`, whose hotspot leaves the
  target pixel visible — that pointer switch is not implemented here yet).
- [x] **Phase 3 — center selection.** `SymmetryCenterSelectorTool`
  (`src/tools/SymmetryCenterSelectorTool.tsx`), DPaint's `IMSymCent` equivalent:
  an inverted crosshair follows the cursor, left click sets `symmetry.center`
  and exits back to the previous tool, right click on the canvas cancels.
  Entering selection also turns symmetry on. Activated from the settings panel
  (DPaint instead used a Picture ▸ Symmetry Center menu item — `MENU.C:133`).
- [x] **Phase 4 — settings panel.** `SymmetrySettings`
  (`src/components/symmetry/SymmetrySettings.tsx`), DPaint's `SymRequest`
  equivalent: order slider (1–40), Cyclic/Mirror choice, center display with
  Select/Reset. Opened by **right-clicking the symmetry toolbox button** —
  faithful to DPaint's control panel (`CTRPAN.C:245`:
  `if (but==1) TogSymSt(); else DoSymReq();`).

### Notes / future work

- `symmetry.activeSettings` is Overmind-derived, so the settings object is
  cached; `symmetryCopies()` still builds transform closures per draw call and
  could be memoized on settings if it ever shows up in profiling.
- Our ellipse tool has a `rotationAngle` DPaint I's oval lacked; under symmetry
  we keep it fixed (shape doesn't rotate, matching rect/oval). If radial rotation
  is ever wanted, that would be a deliberate deviation from DPaint.
