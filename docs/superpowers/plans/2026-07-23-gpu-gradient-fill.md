# GPU-computed gradient fill for circle/ellipse/rect

## Context

Gradient Fill currently rasterizes a filled shape into a `Point[]` on the CPU,
classifies every point into a color band (`bucketPointsByGradient`, with
per-pixel `Math.random()` dither), and issues one `points()` draw call per
band. Combined with Symmetry (which redraws the whole shape once per
kaleidoscope copy), a large gradient-filled circle at the default 6-way
mirrored symmetry setting became visibly laggy in the overlay preview —
225k+ points rasterized and bucketed independently 12 times per mouse move.

A same-session fix made `SymmetryBrush` bucket once and translate the
already-bucketed points per copy (`DrawCallBuffer.translateTo`,
`SymmetryBrush.collectFilledByReferencePoint`). Measured effect: ~15–30%
faster, verified correct (bucketing ran once, copies shared identical
relative dither). But the win was modest for the added indirection, and the
remaining cost — translating hundreds of thousands of point objects through
JS once per copy — is structural, not something further CPU tuning fixes.
That workaround has since been **reverted** (`git revert`, back to the
plain per-copy `SymmetryBrush`/`DrawCallBuffer` code) rather than kept
alongside this plan — not worth carrying two overlapping fixes for the same
problem while this one is pending.

This plan replaces that (now-reverted) CPU workaround with GPU-computed
gradient fill for the three *convex, analytically-describable* shapes
(circle, ellipse, axis-aligned rect): the fragment shader decides each
pixel's band and dither in-place, so a filled shape becomes one draw call
with a handful of uniforms regardless of its pixel area, and a symmetry
copy becomes another draw call with a translated center — no CPU
rasterization, no per-copy point translation, and true per-copy symmetry
falls out for free (see below).

It also fixes the worst case of color cycling's overlay replay
(`OverlayCanvasController.redrawForCycling`): the replay re-issues the
current preview frame's every draw call on each cycling step, so a
gradient-filled preview under symmetry — today hundreds of per-band
`points()` batches across all copies — repays its full draw cost up to
60×/second while cycling. With this plan that same frame is one recorded
`gradientFill` entry per copy.

**Out of scope, staying on the existing CPU path unchanged:** flood fill and
filled polygons. Both fill genuinely irregular/non-convex regions (flood
fill's arbitrary blob, a polygon that can self-intersect or have concave
vertices) that don't reduce to a simple per-fragment inside/outside test the
way a circle or axis-aligned rect does. `bucketPointsByGradient` and
`fillStyleDraw.ts`'s `drawFilledLines` stay exactly as they are for these
two callers.

## Why this is possible: how the renderer already works

Painted pixels never store RGB directly — every canvas pixel is a **color
index** written into a texture, later resolved to a color by a *separate*
palette-lookup pass (`docs/` / CLAUDE.md "Rendering" section;
`src/canvas/paintingCanvas/program/GeometricIndexer.ts`,
`src/canvas/overlayCanvas/program/OverlayGeometricRenderer.ts`). Concretely:

- **Commit path** (`GeometricIndexer.ts`): `indexQuad`/`indexPoints`/
  `indexLines` bind a framebuffer over the color-index texture and run a
  fragment shader that writes one **uniform** `u_pixel` (a packed index, not
  an RGB color) across every fragment of the draw call. Gradient fill today
  works around this by issuing one draw call per band because the shader
  itself can't vary the index per-pixel.
- **Preview path** (`OverlayGeometricRenderer.ts`): resolves a `PaintColor`
  to RGB *in JS* and passes it as a uniform `u_color`; `OverlayDrawImageRenderer.ts`
  shows the alternative already in use elsewhere — sampling a **palette
  texture** (`u_palette`, texture unit 1, the same texture `CycleDriver`
  re-uploads every cycling tick) by index inside the fragment shader.

So the missing piece in both places is the same: a fragment shader that
computes the *index* per-fragment (band classification + dither) instead of
receiving one uniform index for the whole draw call. Once the index is
computed per-fragment, the commit path writes it directly (same output
format `GeometricIndexer` already uses); the preview path samples the
already-bound `u_palette` texture at that index (same pattern
`OverlayDrawImageRenderer` already uses) — meaning the overlay's gradient
preview automatically animates with color cycling too, no extra work.

## Design

### 1. Shape descriptor and the new `DrawTarget` method

Add to `src/canvas/CanvasController.ts`'s `DrawTarget` interface:

```ts
gradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void;
```

(`seed`: the per-stroke dither seed — see "Seed lifecycle" in section 3.)

`GradientShape` (new, in `src/algorithm/gradientFill.ts` next to
`GradientFillStyle`): a small tagged union —

```ts
type GradientShape =
  | { kind: 'rect'; start: Point; end: Point }
  | { kind: 'circle'; center: Point; radius: number }
  | { kind: 'ellipse'; center: Point; radiusX: number; radiusY: number; rotationAngle: number };
```

### 2. Fragment shader math (ported from `colorIdForPosition`)

New shared GLSL source (a template string, colocated with the new
indexer/renderer files, or a small `gradientShaderLib.ts` mirroring the
existing `effectShaderLib.ts` pattern) implementing:

- **Inside/outside test.** Rect: none needed (the quad *is* the shape).
  Circle: `discard` if `dot(v_local / u_radius, v_local / u_radius) > 1.0`
  where `v_local` is the fragment's canvas position minus `u_center`
  (a varying, computed in the vertex shader from a uniform center so every
  copy only changes `u_center`). Ellipse: same test with the local position
  first rotated by `-u_rotationAngle` and scaled by `1/radiusX, 1/radiusY`.
- **Band index.** Direct port of `colorIdForPosition`'s arithmetic
  (`floor((pos - min + jitter) / pointsPerColor)`, clamped to
  `[0, bandCount]`) as uniforms `u_rangeLow`, `u_bandCount`, `u_dither`,
  `u_jitterPercent`, plus `u_axisMode`
  (0=vertical/1=horizontal/2=horizontalLine — three modes, not two) and the
  span bounds. **Carry the CPU path's exact span semantics and degenerate
  guards**: span is `max - min` (the extent, *not* `+1`); `span <= 0` (a
  1-pixel-tall/-wide shape) resolves to `u_rangeLow`; and a single-color
  range (`rangeHigh == rangeLow`, `bandCount <= 0`) never reaches the shader
  at all — `fillStyleDraw` takes its existing solid branch, same as
  `bucketPointsByGradient`'s degenerate case today.
  `u_rangeLow` is a 1-based color id on the JS side; convert to the 0-based
  storage index **at the uniform boundary** (the `(id - 1) / 255` packing
  `updatePixelUniform` already uses) — the shader only ever sees storage
  indices. For **circle/ellipse**, `'horizontalLine'` axis reduces to a
  closed form — no CPU-side row/contiguous-run bookkeeping needed, since
  every row of a convex shape is exactly one run: the local x-span at a
  given `v_local.y` is `2 * sqrt(radius^2 - v_local.y^2)` (circle) or the
  ellipse equivalent. For **rect**, every axis mode's span is just the
  rect's own width/height — also closed-form. This is *why* horizontalLine
  is tractable in-shader for these three shapes and not for polygon/flood
  fill (genuinely irregular per-row runs).
- **Dither.** GLSL has no RNG; use a standard deterministic hash of the
  *local* (center-relative) fragment position (e.g.
  `fract(sin(dot(v_local, vec2(12.9898,78.233))) * 43758.5453)`) in place of
  `Math.random()`. Because the hash is a function of *local*, not absolute,
  position, every symmetry copy — same local coordinates, same hash —
  produces **byte-identical relative dither**, satisfying "truly symmetric"
  without any shared-buffer bookkeeping on the CPU side.
  **Add a per-stroke seed** (`u_seed`, one JS-side `Math.random()` per
  stroke, mixed into the hash and shared by every symmetry copy and every
  redraw of that stroke): a position-only hash is static, so filling the
  same shape at the same spot twice would produce byte-identical speckle,
  where `Math.random()` (and PyDPainter, the fidelity reference) re-rolls
  every fill. The seed restores per-fill variation without breaking the
  per-copy identity above. Two consequences are intended behavior changes,
  both improvements: the live preview stops re-shimmering on every mouse
  move (same seed for the whole drag), and the committed fill's dither is
  now byte-identical to the preview the user just saw.
- **Precision.** The existing display shaders declare `precision mediump
  float`, and `fract(sin(x) * 43758.5453)` degrades exactly when `x` gets
  large under limited precision. Center-relative locals keep the hash input
  small (bounded by the shape size, not canvas position), which is the
  assumption that makes mediump acceptable — state it in the shader comment,
  and if Safari (the risk browser) still shows banding/patterning in the
  dither, switch the hash to an integer-friendly one before reaching for
  `highp`.

Document the conventions (0..1 hash, local-space input, per-stroke seed)
once in the shared GLSL source comment rather than in each shader.

### 3. Two new renderer classes, mirroring existing ones exactly

- `src/canvas/paintingCanvas/program/GradientGeometricIndexer.ts` — modeled
  on `GeometricIndexer.ts`: binds the color-index framebuffer, uploads the
  shape's bounding quad (4 vertices) plus the uniforms above, writes the
  computed index into `gl_FragColor` in the same packed format
  `updatePixelUniform` uses today (`(index)/255` in R,
  `ALPHA_INDEXED/255` in A).
- `src/canvas/overlayCanvas/program/OverlayGradientRenderer.ts` — modeled on
  `OverlayGeometricRenderer.ts`/`OverlayDrawImageRenderer.ts`: same
  band/dither/discard logic, but samples `u_palette` (already bound at unit
  1) at the computed index and outputs RGB directly.

Wire both into `MainCanvasRenderer`/`PaintingCanvasController` and
`OverlayMainCanvasRenderer`/`OverlayCanvasController` the same way
`points`/`lines`/`quad` are wired today. In `OverlayCanvasController`,
`gradientFill` must call `recordFrameDraw(...)` like the other draw methods
(see `redrawForCycling`/`beginFrame` from the color-cycling work) so the
live gradient preview keeps animating under Tab-cycling — it already will,
for free, since the shader samples the same `u_palette` texture
`CycleDriver` updates, but the call still needs replaying each cycling tick
like every other overlay draw.

`DrawCallBuffer.gradientFill` just records `{shape, style, seed}` entries and
replays them via `target.gradientFill(...)` on `replayTo` — no color-based
merging needed (each call is already cheap; nothing to batch). One ordering
note: the buffer replays batches grouped by primitive type, so a recorded
`gradientFill` replays out of original order relative to `points`/`lines`
calls — the same looseness the existing batching already has, harmless for
opaque fills.

**Seed lifecycle.** The per-stroke dither seed travels as a plain `number`
parameter on `gradientFill(shape, style, seed)` so it survives
`DrawCallBuffer` replay and the overlay's cycling replay unchanged. It lives
as module state in `src/brush/fillStyleDraw.ts` (`currentGradientSeed()`,
read at the point the branch chooses the gradient path — every symmetry copy
of a stroke therefore reads the same value) and is re-rolled by a one-line
`newGradientSeed()` call in `undo.setUndoPoint()`, the funnel every
committed stroke already ends with. Net semantics: a fresh speckle per
committed fill, one stable speckle across a whole drag's preview and its
commit, identical speckle across all symmetry copies.

### 4. Wire `fillStyleDraw.ts` to the new path

In `drawFilledQuad` (rect) and wherever circle/ellipse rasterize today
(`PixelBrush`/`CustomBrush`'s `drawFilledCircle`/`drawFilledEllipse`, which
currently call `drawFilledLines`), branch: if
`overmind.state.fillStyle.effectiveFillStyle` is set, call
`canvas.gradientFill({kind: ..., ...}, style)` instead of rasterizing to
points. Solid mode is untouched (still the cheap `quad()`/`lines()` call).
**`drawFilledPolygon` keeps calling `drawFilledLines` unconditionally** —
never routes through `gradientFill`.

### 5. No CPU workaround to remove

The CPU bucket-once-and-translate workaround this plan supersedes has
already been reverted (see Context). `SymmetryBrush.drawFilledRect`/
`drawFilledCircle`/`drawFilledEllipse` are back to the plain per-copy
`collect` pattern used everywhere else in that file (`this.collect(canvas,
copies, (inner, copy, target) => inner.drawFilledCircle(copy.point(center),
radius, target))`), and `DrawCallBuffer` has no `translateTo`. Nothing to
delete when this plan lands — the new `gradientFill` method is purely
additive to both files. `drawFilledPolygon` was never touched by that
workaround and needs no change here either.

## Files touched

- `src/canvas/CanvasController.ts` — `DrawTarget.gradientFill`
- `src/algorithm/gradientFill.ts` — `GradientShape` type
- `src/canvas/paintingCanvas/program/GradientGeometricIndexer.ts` — new
- `src/canvas/overlayCanvas/program/OverlayGradientRenderer.ts` — new
- `src/canvas/paintingCanvas/PaintingCanvasController.ts` — wire the new
  indexer (`MainCanvasRenderer` itself likely needs no change: after
  indexing, call its existing `renderCanvas()`, exactly what `quad`/
  `drawImage` do today)
- `src/canvas/overlayCanvas/OverlayMainCanvasRenderer.ts`,
  `OverlayCanvasController.ts` — wire the new renderer, `recordFrameDraw`
- `src/brush/DrawCallBuffer.ts` — `gradientFill` recording/replay (purely
  additive; no `translateTo` to remove, already reverted)
- `src/brush/SymmetryBrush.ts` — no change needed; filled rect/circle/
  ellipse already use the plain per-copy `collect` pattern
- `src/brush/fillStyleDraw.ts`, `PixelBrush.tsx`, `CustomBrush.tsx` — branch
  to `gradientFill` for rect/circle/ellipse when gradient mode is active
  (single-color range excepted — that stays on the solid branch);
  `fillStyleDraw.ts` also hosts the seed module state
- `src/overmind/undo/actions.ts` — one-line `newGradientSeed()` in
  `setUndoPoint`
- `test/brush/DrawCallBuffer.test.ts` — add `gradientFill` recording/replay
  tests

## Verification

No unit-testable surface for the shader math itself (GLSL, consistent with
this repo's convention that WebGL/rendering code is untested — CLAUDE.md).
Verify end-to-end with the `verify` skill (CDP-driven, as used this
session):

1. **Correctness, all three shapes**: draw a gradient-filled rect, circle,
   and ellipse (each axis mode: vertical/horizontal/horizontalLine),
   compare visually against today's CPU output (same dither *look*, exact
   pixels will differ since the hash isn't `Math.random()`).
2. **Edge-coverage parity**: the analytic `discard` test will not match
   `shape.ts`'s rasterized footprint pixel-for-pixel at the boundary.
   Compare a GPU-filled circle/ellipse against `filledCircle`/
   `filledEllipse` for the same drag (screenshot diff): decide up front
   that ±1 px along the edge is acceptable, or adjust the inside test's
   rounding to match the rasterizer if the mismatch is visible against the
   unfilled variant of the same shape.
3. **Seed semantics**: two identical fills at the same spot show different
   speckle (fresh seed per commit); within one drag, the preview does not
   shimmer between mouse moves and the committed pixels match the last
   preview frame exactly.
4. **True symmetry**: gradient circle with symmetry on, screenshot two
   copies, confirm pixel-identical relative dither (same method used this
   session).
5. **Performance**: repeat this session's `Performance.getMetrics`
   before/after measurement for a large gradient-filled circle at default
   symmetry (order 6, mirror on) — expect the cost to stop scaling with
   shape area entirely (dominant cost becomes ~constant per copy).
6. **Cycling integration**: Tab-cycle while a gradient shape preview is
   showing (drag not yet released) — the preview should animate through the
   cycled palette, matching the already-working brush-cursor/crosshair
   cycling replay.
7. **Regression**: flood fill and filled-polygon gradient fill still work
   (unchanged code path).
8. `npm test && npm run build && npm run lint` clean throughout.
