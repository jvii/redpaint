# GPU Gradient Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gradient-fill circle/ellipse/rect in the fragment shader — one draw call per shape (and per symmetry copy) instead of CPU-rasterizing and bucketing hundreds of thousands of points.

**Architecture:** A new `DrawTarget.gradientFill(shape, style, seed)` primitive, implemented by a `GradientGeometricIndexer` on the commit path (writes per-fragment palette indices into the color-index texture) and an `OverlayGradientRenderer` on the preview path (samples the palette texture at the per-fragment index, so previews cycle with Tab automatically). Band/dither math is a GLSL port of `colorIdForPosition`, seeded per stroke. Symmetry is untouched: `SymmetryBrush` still calls the wrapped brush once per copy; each copy just becomes one cheap `gradientFill` call. Design + review notes: `docs/superpowers/plans/2026-07-23-gpu-gradient-fill.md`.

**Tech Stack:** TypeScript (tsconfig `strict: false`, ESLint requires explicit return types), raw WebGL1 (GLSL ES 1.00), Overmind, Vitest.

## Global Constraints

- **No new dependencies.**
- **Formatting:** Prettier, 100-col width, single quotes, ES5 trailing commas. Run `npx prettier --write <files>` before committing.
- **Commit messages:** imperative subject, no conventional-commit prefixes (repo style).
- **Tests** live under `test/`, mirroring `src/`. Pure layers only; GLSL/WebGL/controller code is untested by convention (CLAUDE.md) — the shader math is verified end-to-end in Task 7.
- **Commands:** `npm test` (Vitest, single run), `npm run build` (tsc --noEmit + vite build), `npm run lint`, `npm start` (dev server on http://localhost:3000).
- **Color ids are 1-based** app-wide; palette texture/storage indices are 0-based. The −1 conversion happens exactly once, in `gradientFillUniforms` (Task 1).
- **Out of scope:** flood fill and filled polygons stay on the CPU path (`bucketPointsByGradient`/`drawFilledLines`) unchanged. Solid mode and single-color (degenerate) ranges also stay on the existing CPU path.
- **Dither seed semantics** (from the design doc): fresh speckle per committed fill, one stable speckle across a drag's preview and its commit, identical speckle across all symmetry copies.
- **Shader precision:** `precision mediump float`, same as the existing programs. The hash input must stay in *local* (shape-relative) coordinates so it remains small — this is the assumption that makes mediump safe; keep the comment saying so.

---

### Task 1: Pure geometry and uniform preparation

**Files:**
- Modify: `src/algorithm/gradientFill.ts`
- Test: `test/algorithm/gradientFill.test.ts`

**Interfaces:**
- Consumes: existing `GradientFillStyle`, `GradientAxis`, `DEFAULT_JITTER_PERCENT` (module-private constant in the same file), `Point` from `src/types.ts`.
- Produces (Tasks 3–6 rely on these exact shapes):

```ts
export type GradientShape =
  | { kind: 'rect'; start: Point; end: Point }
  | { kind: 'circle'; center: Point; radius: number }
  | { kind: 'ellipse'; center: Point; radiusX: number; radiusY: number; rotationAngle: number };

export interface GradientUniforms {
  shapeKind: 0 | 1 | 2; // rect | circle | ellipse — matches u_shapeKind
  center: Point; // shape center (rect: bbox center), canvas coords
  radiusX: number; // circle: r; ellipse: rx; rect: half width (unused by shader)
  radiusY: number;
  rotation: number; // radians, 0 for rect/circle
  axisMode: 0 | 1 | 2; // vertical | horizontal | horizontalLine — matches u_axisMode
  axisMin: number; // band-0 position along the axis (vertical/horizontal; rect rows)
  axisSpan: number; // extent along the axis, max - min (NOT +1 — CPU parity)
  bandCount: number; // rangeHigh - rangeLow, caller guarantees >= 1
  rangeLowIndex: number; // 0-based palette storage index (rangeLow - 1)
  ditherJitter: number; // dither * jitterPercent / 100; 0 disables dither
  seed: number;
  // inclusive pixel bounds of the shape — the bounding quad to draw
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function gradientFillUniforms(
  shape: GradientShape,
  style: GradientFillStyle,
  seed: number
): GradientUniforms;
```

- [ ] **Step 1: Write the failing tests**

Append to `test/algorithm/gradientFill.test.ts` (add `gradientFillUniforms` and `GradientShape` to its existing import from `../../src/algorithm/gradientFill`):

```ts
describe('gradientFillUniforms', () => {
  const style = { axis: 'vertical' as const, rangeLow: 5, rangeHigh: 9, dither: 6, jitter: 50 };

  it('maps a circle to center/radius and its inclusive pixel bounds', () => {
    const u = gradientFillUniforms(
      { kind: 'circle', center: { x: 50, y: 40 }, radius: 10 },
      style,
      7
    );
    expect(u.shapeKind).toBe(1);
    expect(u.center).toEqual({ x: 50, y: 40 });
    expect(u.radiusX).toBe(10);
    expect(u.radiusY).toBe(10);
    expect(u.rotation).toBe(0);
    expect({ left: u.left, top: u.top, right: u.right, bottom: u.bottom }).toEqual({
      left: 40,
      top: 30,
      right: 60,
      bottom: 50,
    });
  });

  it('vertical axis spans the bounds top to bottom (extent, not +1)', () => {
    const u = gradientFillUniforms(
      { kind: 'circle', center: { x: 50, y: 40 }, radius: 10 },
      style,
      7
    );
    expect(u.axisMode).toBe(0);
    expect(u.axisMin).toBe(30);
    expect(u.axisSpan).toBe(20);
  });

  it('horizontal axis spans left to right', () => {
    const u = gradientFillUniforms(
      { kind: 'rect', start: { x: 12, y: 3 }, end: { x: 2, y: 8 } },
      { ...style, axis: 'horizontal' },
      7
    );
    expect(u.shapeKind).toBe(0);
    expect(u.axisMode).toBe(1);
    // start/end normalize: bounds are min/max of the two corners
    expect({ left: u.left, top: u.top, right: u.right, bottom: u.bottom }).toEqual({
      left: 2,
      top: 3,
      right: 12,
      bottom: 8,
    });
    expect(u.axisMin).toBe(2);
    expect(u.axisSpan).toBe(10);
    expect(u.center).toEqual({ x: 7, y: 5.5 });
  });

  it('converts the 1-based range to 0-based storage and premultiplies dither', () => {
    const u = gradientFillUniforms(
      { kind: 'rect', start: { x: 0, y: 0 }, end: { x: 9, y: 9 } },
      style,
      7
    );
    expect(u.bandCount).toBe(4); // 9 - 5
    expect(u.rangeLowIndex).toBe(4); // 5 - 1
    expect(u.ditherJitter).toBe(3); // 6 * 50 / 100
    expect(u.seed).toBe(7);
  });

  it('defaults jitter to the module default (100/6) when omitted', () => {
    const u = gradientFillUniforms(
      { kind: 'rect', start: { x: 0, y: 0 }, end: { x: 9, y: 9 } },
      { axis: 'vertical', rangeLow: 1, rangeHigh: 3, dither: 6 },
      7
    );
    expect(u.ditherJitter).toBeCloseTo(1); // 6 * (100/6) / 100
  });

  it('bounds of a rotated ellipse cover the rotated extents', () => {
    // 90 degrees: x/y extents swap
    const u = gradientFillUniforms(
      { kind: 'ellipse', center: { x: 100, y: 100 }, radiusX: 20, radiusY: 5, rotationAngle: 90 },
      style,
      7
    );
    expect(u.shapeKind).toBe(2);
    expect(u.rotation).toBeCloseTo(Math.PI / 2);
    expect(u.left).toBeLessThanOrEqual(95);
    expect(u.right).toBeGreaterThanOrEqual(105);
    expect(u.top).toBeLessThanOrEqual(80);
    expect(u.bottom).toBeGreaterThanOrEqual(120);
  });

  it('horizontalLine axis still carries the bbox span (the rect rows use it)', () => {
    const u = gradientFillUniforms(
      { kind: 'rect', start: { x: 2, y: 3 }, end: { x: 12, y: 8 } },
      { ...style, axis: 'horizontalLine' },
      7
    );
    expect(u.axisMode).toBe(2);
    expect(u.axisMin).toBe(2);
    expect(u.axisSpan).toBe(10);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- test/algorithm/gradientFill.test.ts`
Expected: FAIL — `gradientFillUniforms` is not exported.

- [ ] **Step 3: Implement**

Append to `src/algorithm/gradientFill.ts`:

```ts
// A convex, analytically-describable filled shape for the GPU gradient path
// (docs/superpowers/plans/2026-07-23-gpu-gradient-fill.md). Flood fill and
// polygons are deliberately NOT here — their regions have no closed form.
export type GradientShape =
  | { kind: 'rect'; start: Point; end: Point }
  | { kind: 'circle'; center: Point; radius: number }
  | { kind: 'ellipse'; center: Point; radiusX: number; radiusY: number; rotationAngle: number };

// Everything the gradient shaders need, computed once per draw call on the
// JS side. This is the single place where 1-based color ids become 0-based
// storage indices and where degrees become radians.
export interface GradientUniforms {
  shapeKind: 0 | 1 | 2; // rect | circle | ellipse
  center: Point;
  radiusX: number;
  radiusY: number;
  rotation: number; // radians
  axisMode: 0 | 1 | 2; // vertical | horizontal | horizontalLine
  axisMin: number;
  axisSpan: number; // extent (max - min), matching bucketPointsByGradient
  bandCount: number;
  rangeLowIndex: number; // 0-based
  ditherJitter: number; // dither * jitterPercent / 100
  seed: number;
  left: number; // inclusive pixel bounds = the bounding quad to draw
  top: number;
  right: number;
  bottom: number;
}

const AXIS_MODE: { [axis in GradientAxis]: 0 | 1 | 2 } = {
  vertical: 0,
  horizontal: 1,
  horizontalLine: 2,
};

export function gradientFillUniforms(
  shape: GradientShape,
  style: GradientFillStyle,
  seed: number
): GradientUniforms {
  let center: Point;
  let radiusX = 0;
  let radiusY = 0;
  let rotation = 0;
  let left: number;
  let top: number;
  let right: number;
  let bottom: number;

  if (shape.kind === 'rect') {
    left = Math.min(shape.start.x, shape.end.x);
    right = Math.max(shape.start.x, shape.end.x);
    top = Math.min(shape.start.y, shape.end.y);
    bottom = Math.max(shape.start.y, shape.end.y);
    center = { x: (left + right) / 2, y: (top + bottom) / 2 };
    radiusX = (right - left) / 2;
    radiusY = (bottom - top) / 2;
  } else if (shape.kind === 'circle') {
    center = shape.center;
    radiusX = shape.radius;
    radiusY = shape.radius;
    left = shape.center.x - shape.radius;
    right = shape.center.x + shape.radius;
    top = shape.center.y - shape.radius;
    bottom = shape.center.y + shape.radius;
  } else {
    center = shape.center;
    radiusX = shape.radiusX;
    radiusY = shape.radiusY;
    rotation = shape.rotationAngle * (Math.PI / 180);
    // extents of a rotated ellipse's axis-aligned bounding box
    const c = Math.abs(Math.cos(rotation));
    const s = Math.abs(Math.sin(rotation));
    const extentX = radiusX * c + radiusY * s;
    const extentY = radiusX * s + radiusY * c;
    left = Math.floor(shape.center.x - extentX);
    right = Math.ceil(shape.center.x + extentX);
    top = Math.floor(shape.center.y - extentY);
    bottom = Math.ceil(shape.center.y + extentY);
  }

  const vertical = style.axis === 'vertical';
  const jitterPercent = style.jitter ?? DEFAULT_JITTER_PERCENT;
  return {
    shapeKind: shape.kind === 'rect' ? 0 : shape.kind === 'circle' ? 1 : 2,
    center,
    radiusX,
    radiusY,
    rotation,
    axisMode: AXIS_MODE[style.axis],
    axisMin: vertical ? top : left,
    axisSpan: vertical ? bottom - top : right - left,
    bandCount: style.rangeHigh - style.rangeLow,
    rangeLowIndex: style.rangeLow - 1,
    ditherJitter: (style.dither * jitterPercent) / 100,
    seed,
    left,
    top,
    right,
    bottom,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- test/algorithm/gradientFill.test.ts`
Expected: PASS (new suite plus the pre-existing `bucketPointsByGradient` suites).

- [ ] **Step 5: Commit**

```bash
git add src/algorithm/gradientFill.ts test/algorithm/gradientFill.test.ts
git commit -m "Add GradientShape and per-draw uniform preparation for GPU gradient fill"
```

---

### Task 2: Shared gradient GLSL library

**Files:**
- Create: `src/canvas/util/gradientShaderLib.ts`

**Interfaces:**
- Consumes: nothing (pure GLSL strings).
- Produces (Tasks 3–4 embed these): `GRADIENT_VERTEX_SHADER: string` and `GRADIENT_LIB: string`. `GRADIENT_LIB` declares all `u_*` uniforms and defines `float gradientStorageIndex()` which returns the fragment's **0-based palette storage index** (float) and `discard`s fragments outside the shape. Uniform names (Tasks 3–4 look these up): `u_canvasHeight, u_shapeKind, u_center, u_radius, u_rotation, u_axisMode, u_axisMin, u_axisSpan, u_bandCount, u_rangeLowIndex, u_ditherJitter, u_seed`.

- [ ] **Step 1: Create the file**

```ts
// Shared GLSL for the GPU gradient fill (design:
// docs/superpowers/plans/2026-07-23-gpu-gradient-fill.md). Both the commit
// path (GradientGeometricIndexer) and the preview path
// (OverlayGradientRenderer) embed GRADIENT_LIB and differ only in what they
// do with the returned palette index. Mirrors the effectShaderLib.ts
// pattern.
//
// Conventions, documented once here:
//  * gradientHash returns 0..1; its input is a LOCAL (shape-relative)
//    position plus the per-stroke seed. Local coords are bounded by the
//    shape size, not the canvas, which is what keeps fract(sin(...)) safe
//    at mediump precision. Every symmetry copy of a stroke shares local
//    coords and seed, so all copies get identical (translated) speckle.
//  * The band math is a direct port of colorIdForPosition
//    (src/algorithm/gradientFill.ts): floor-divided bands over an extent
//    span (max - min), signed uniform jitter of half-width
//    u_ditherJitter * pointsPerColor, clamped to [0, u_bandCount].
//  * span <= 0.0 (a one-pixel row/column) resolves to band 0 = u_rangeLowIndex,
//    matching the CPU path's `span <= 0` guard.
//  * All uniforms are floats/vec2 except the two mode selectors (int).

export const GRADIENT_VERTEX_SHADER = `
    attribute vec4 a_position;

    void main () {
      gl_Position = a_position;
    }
    `;

export const GRADIENT_LIB = `
    precision mediump float;

    uniform float u_canvasHeight; // drawing buffer height in pixels
    uniform int u_shapeKind;      // 0 = rect, 1 = circle, 2 = ellipse
    uniform vec2 u_center;        // shape center, canvas coords (y down)
    uniform vec2 u_radius;        // (rx, ry); circle: (r, r)
    uniform float u_rotation;     // ellipse rotation in radians, else 0.0
    uniform int u_axisMode;       // 0 = vertical, 1 = horizontal, 2 = horizontalLine
    uniform float u_axisMin;      // band-0 axis position (modes 0/1; rect rows in mode 2)
    uniform float u_axisSpan;     // axis extent, max - min
    uniform float u_bandCount;    // rangeHigh - rangeLow, >= 1.0
    uniform float u_rangeLowIndex;// 0-based storage index of the range start
    uniform float u_ditherJitter; // dither * jitterPercent / 100; 0.0 = off
    uniform float u_seed;         // per-stroke dither seed

    float gradientHash(vec2 p) {
      return fract(sin(dot(p + u_seed, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float gradientBand(float pos, float minPos, float span, vec2 hashPos) {
      if (span <= 0.0) {
        return 0.0;
      }
      float pointsPerColor = span / (u_bandCount + 1.0);
      float jitter = 0.0;
      float halfWidth = u_ditherJitter * pointsPerColor;
      if (halfWidth > 0.0) {
        jitter = (gradientHash(hashPos) * 2.0 - 1.0) * halfWidth;
      }
      float idx = floor((pos - minPos + jitter) / pointsPerColor);
      return clamp(idx, 0.0, u_bandCount);
    }

    // The fragment's canvas pixel: gl_FragCoord is window-space with y up
    // and pixel centers at +0.5; flip y and floor to integer pixel coords.
    vec2 canvasPixel() {
      return floor(vec2(gl_FragCoord.x, u_canvasHeight - gl_FragCoord.y));
    }

    // 0-based palette storage index for this fragment. Discards fragments
    // outside the shape (rect never discards: its quad IS the shape).
    float gradientStorageIndex() {
      vec2 pix = canvasPixel();
      vec2 local = pix - u_center;

      float c = cos(u_rotation);
      float s = sin(u_rotation);
      // ellipse-frame coords; identity when u_rotation is 0 (rect/circle)
      vec2 e = vec2(local.x * c + local.y * s, -local.x * s + local.y * c);

      if (u_shapeKind != 0) {
        vec2 n = e / u_radius;
        if (dot(n, n) > 1.0) {
          discard;
        }
      }

      float pos;
      float minPos;
      float span;
      if (u_axisMode == 0) {
        pos = pix.y; minPos = u_axisMin; span = u_axisSpan;
      } else if (u_axisMode == 1) {
        pos = pix.x; minPos = u_axisMin; span = u_axisSpan;
      } else if (u_shapeKind == 0) {
        // horizontalLine on a rect: every row spans the full width
        pos = pix.x; minPos = u_axisMin; span = u_axisSpan;
      } else if (u_shapeKind == 1) {
        // horizontalLine on a circle: this row's single run, closed form
        float half = sqrt(max(u_radius.x * u_radius.x - local.y * local.y, 0.0));
        pos = pix.x; minPos = u_center.x - half; span = 2.0 * half;
      } else {
        // horizontalLine on a rotated ellipse: for a fixed canvas row
        // (local.y), the implicit equation
        //   ((x c + y s) / rx)^2 + ((-x s + y c) / ry)^2 = 1
        // is a quadratic A x^2 + B x + C = 0 in local x; its two roots are
        // the run's ends. disc is clamped at 0 (rows grazing the edge).
        float rx2 = u_radius.x * u_radius.x;
        float ry2 = u_radius.y * u_radius.y;
        float A = (c * c) / rx2 + (s * s) / ry2;
        float B = 2.0 * local.y * c * s * (1.0 / rx2 - 1.0 / ry2);
        float C = local.y * local.y * ((s * s) / rx2 + (c * c) / ry2) - 1.0;
        float root = sqrt(max(B * B - 4.0 * A * C, 0.0));
        float x0 = (-B - root) / (2.0 * A);
        float x1 = (-B + root) / (2.0 * A);
        pos = pix.x; minPos = u_center.x + x0; span = x1 - x0;
      }

      return u_rangeLowIndex + gradientBand(pos, minPos, span, local);
    }
    `;
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: clean (nothing imports the file yet; this catches TS syntax only — GLSL compiles at runtime in Task 3).

- [ ] **Step 3: Commit**

```bash
git add src/canvas/util/gradientShaderLib.ts
git commit -m "Add shared gradient-fill GLSL: band math, dither hash, shape tests"
```

---

### Task 3: GradientGeometricIndexer (commit path)

**Files:**
- Create: `src/canvas/paintingCanvas/program/GradientGeometricIndexer.ts`

**Interfaces:**
- Consumes: `GRADIENT_VERTEX_SHADER`, `GRADIENT_LIB` (Task 2); `gradientFillUniforms`, `GradientShape` (Task 1); `createProgram`, `activateProgram` from `src/canvas/util/webglUtil.ts`; `canvasToWebGLCoordX/Y` from `src/canvas/util/util.ts`; `ALPHA_INDEXED` from `src/domain/CanvasColorIndex.ts`.
- Produces (Task 5 wires this): `class GradientGeometricIndexer { constructor(gl: WebGLRenderingContext, targetFrameBuffer: WebGLFramebuffer); indexGradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void; dispose(): void }`.

- [ ] **Step 1: Create the file**

```ts
import { GradientFillStyle, GradientShape, gradientFillUniforms } from '../../../algorithm/gradientFill';
import { canvasToWebGLCoordX, canvasToWebGLCoordY } from '../../util/util';
import { createProgram, activateProgram } from '../../util/webglUtil';
import { GRADIENT_LIB, GRADIENT_VERTEX_SHADER } from '../../util/gradientShaderLib';
import { ALPHA_INDEXED } from '../../../domain/CanvasColorIndex';

// Writes a gradient-filled convex shape (rect/circle/ellipse) into the
// color-index texture in ONE draw call: the fragment shader classifies each
// pixel into its color band (with per-stroke seeded dither) and writes the
// packed indexed pixel directly — the per-fragment version of what
// GeometricIndexer's u_pixel does per draw call. See
// docs/superpowers/plans/2026-07-23-gpu-gradient-fill.md.
export class GradientGeometricIndexer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private targetFrameBuffer: WebGLFramebuffer;
  // locations looked up once: getUniformLocation/getAttribLocation are driver
  // round-trips, too slow for per-draw-call use
  private a_position: number;
  private uniforms: { [name: string]: WebGLUniformLocation | null };

  public constructor(gl: WebGLRenderingContext, targetFrameBuffer: WebGLFramebuffer) {
    this.gl = gl;
    this.program = this.createProgram();
    this.targetFrameBuffer = targetFrameBuffer;
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    this.uniforms = {};
    for (const name of [
      'u_canvasHeight',
      'u_shapeKind',
      'u_center',
      'u_radius',
      'u_rotation',
      'u_axisMode',
      'u_axisMin',
      'u_axisSpan',
      'u_bandCount',
      'u_rangeLowIndex',
      'u_ditherJitter',
      'u_seed',
    ]) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
  }

  public indexGradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void {
    const gl = this.gl;
    const u = gradientFillUniforms(shape, style, seed);

    activateProgram(gl, this.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.targetFrameBuffer);

    gl.uniform1f(this.uniforms['u_canvasHeight'], gl.drawingBufferHeight);
    gl.uniform1i(this.uniforms['u_shapeKind'], u.shapeKind);
    gl.uniform2f(this.uniforms['u_center'], u.center.x, u.center.y);
    gl.uniform2f(this.uniforms['u_radius'], u.radiusX, u.radiusY);
    gl.uniform1f(this.uniforms['u_rotation'], u.rotation);
    gl.uniform1i(this.uniforms['u_axisMode'], u.axisMode);
    gl.uniform1f(this.uniforms['u_axisMin'], u.axisMin);
    gl.uniform1f(this.uniforms['u_axisSpan'], u.axisSpan);
    gl.uniform1f(this.uniforms['u_bandCount'], u.bandCount);
    gl.uniform1f(this.uniforms['u_rangeLowIndex'], u.rangeLowIndex);
    gl.uniform1f(this.uniforms['u_ditherJitter'], u.ditherJitter);
    gl.uniform1f(this.uniforms['u_seed'], u.seed);

    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.a_position);

    // pixel n covers canvas coordinates [n, n+1), so the quad extends to the
    // far edge of the greater pixel (same convention as indexQuad)
    const xLeft = canvasToWebGLCoordX(gl, u.left);
    const xRight = canvasToWebGLCoordX(gl, u.right + 1);
    const yTop = canvasToWebGLCoordY(gl, u.top);
    const yBottom = canvasToWebGLCoordY(gl, u.bottom + 1);

    const vertices = new Float32Array([
      xLeft,
      yTop,
      xLeft,
      yBottom,
      xRight,
      yTop,
      xRight,
      yBottom,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private createProgram(): WebGLProgram {
    const fragmentShader = `
    ${GRADIENT_LIB}

    void main () {
      float index = gradientStorageIndex();
      // packed indexed pixel, same format as GeometricIndexer's u_pixel:
      // storage index in R, ALPHA_INDEXED tag in A (docs/true-color-mode.md)
      gl_FragColor = vec4(index / 255.0, 0.0, 0.0, ${ALPHA_INDEXED}.0 / 255.0);
    }
    `;

    const program = createProgram(this.gl, GRADIENT_VERTEX_SHADER, fragmentShader);
    console.log('Program ready (GradientGeometricIndexer)');
    return program;
  }

  public dispose(): void {
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
  }
}
```

- [ ] **Step 2: Verify**

Run: `npm run build && npm run lint`
Expected: clean (file is not referenced yet; the GLSL itself first compiles at runtime in Task 5's browser check).

- [ ] **Step 3: Commit**

```bash
git add src/canvas/paintingCanvas/program/GradientGeometricIndexer.ts
git commit -m "Add GradientGeometricIndexer writing per-fragment gradient indices"
```

---

### Task 4: OverlayGradientRenderer (preview path)

**Files:**
- Create: `src/canvas/overlayCanvas/program/OverlayGradientRenderer.ts`

**Interfaces:**
- Consumes: same as Task 3, minus `ALPHA_INDEXED`; the overlay's palette texture is already bound on texture unit 1 (`OverlayCanvasController.initPaletteTexture`, re-uploaded by `CycleDriver`).
- Produces (Task 5 wires this): `class OverlayGradientRenderer { constructor(gl: WebGLRenderingContext); renderGradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void; dispose(): void }`.

- [ ] **Step 1: Create the file**

Identical structure to Task 3's class with four differences: no framebuffer (renders straight to the overlay canvas), the constructor takes only `gl`, a `u_palette` sampler uniform pinned to unit 1, and the fragment shader samples the palette instead of writing a packed index — which is exactly why the gradient preview animates under Tab-cycling for free.

```ts
import { GradientFillStyle, GradientShape, gradientFillUniforms } from '../../../algorithm/gradientFill';
import { canvasToWebGLCoordX, canvasToWebGLCoordY } from '../../util/util';
import { createProgram, activateProgram } from '../../util/webglUtil';
import { GRADIENT_LIB, GRADIENT_VERTEX_SHADER } from '../../util/gradientShaderLib';

// The live-preview twin of GradientGeometricIndexer: same shape/band/dither
// GLSL, but resolves the per-fragment index through the palette texture
// (unit 1, the texture CycleDriver re-uploads every cycling step) so the
// preview shows display colors and animates under Tab-cycling for free.
export class OverlayGradientRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private a_position: number;
  private uniforms: { [name: string]: WebGLUniformLocation | null };

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = this.createProgram();
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    this.uniforms = {};
    for (const name of [
      'u_canvasHeight',
      'u_shapeKind',
      'u_center',
      'u_radius',
      'u_rotation',
      'u_axisMode',
      'u_axisMin',
      'u_axisSpan',
      'u_bandCount',
      'u_rangeLowIndex',
      'u_ditherJitter',
      'u_seed',
      'u_palette',
    ]) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
  }

  public renderGradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void {
    const gl = this.gl;
    const u = gradientFillUniforms(shape, style, seed);

    activateProgram(gl, this.program);

    gl.uniform1f(this.uniforms['u_canvasHeight'], gl.drawingBufferHeight);
    gl.uniform1i(this.uniforms['u_shapeKind'], u.shapeKind);
    gl.uniform2f(this.uniforms['u_center'], u.center.x, u.center.y);
    gl.uniform2f(this.uniforms['u_radius'], u.radiusX, u.radiusY);
    gl.uniform1f(this.uniforms['u_rotation'], u.rotation);
    gl.uniform1i(this.uniforms['u_axisMode'], u.axisMode);
    gl.uniform1f(this.uniforms['u_axisMin'], u.axisMin);
    gl.uniform1f(this.uniforms['u_axisSpan'], u.axisSpan);
    gl.uniform1f(this.uniforms['u_bandCount'], u.bandCount);
    gl.uniform1f(this.uniforms['u_rangeLowIndex'], u.rangeLowIndex);
    gl.uniform1f(this.uniforms['u_ditherJitter'], u.ditherJitter);
    gl.uniform1f(this.uniforms['u_seed'], u.seed);
    gl.uniform1i(this.uniforms['u_palette'], 1); // palette texture unit

    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.a_position);

    const xLeft = canvasToWebGLCoordX(gl, u.left);
    const xRight = canvasToWebGLCoordX(gl, u.right + 1);
    const yTop = canvasToWebGLCoordY(gl, u.top);
    const yBottom = canvasToWebGLCoordY(gl, u.bottom + 1);

    const vertices = new Float32Array([
      xLeft,
      yTop,
      xLeft,
      yBottom,
      xRight,
      yTop,
      xRight,
      yBottom,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private createProgram(): WebGLProgram {
    const fragmentShader = `
    ${GRADIENT_LIB}

    uniform sampler2D u_palette;

    void main () {
      float index = gradientStorageIndex();
      gl_FragColor = texture2D(u_palette, vec2((index + 0.5) / 256.0, 0.5));
    }
    `;

    const program = createProgram(this.gl, GRADIENT_VERTEX_SHADER, fragmentShader);
    console.log('Program ready (OverlayGradientRenderer)');
    return program;
  }

  public dispose(): void {
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
  }
}
```

- [ ] **Step 2: Verify**

Run: `npm run build && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/canvas/overlayCanvas/program/OverlayGradientRenderer.ts
git commit -m "Add OverlayGradientRenderer previewing gradients through the palette texture"
```

---

### Task 5: The `gradientFill` DrawTarget seam — interface, controllers, DrawCallBuffer

**Files:**
- Modify: `src/canvas/CanvasController.ts` (the `DrawTarget` interface)
- Modify: `src/canvas/paintingCanvas/ColorIndexer.ts`
- Modify: `src/canvas/paintingCanvas/PaintingCanvasController.ts`
- Modify: `src/canvas/overlayCanvas/OverlayMainCanvasRenderer.ts`
- Modify: `src/canvas/overlayCanvas/OverlayCanvasController.ts`
- Modify: `src/brush/DrawCallBuffer.ts`
- Test: `test/brush/DrawCallBuffer.test.ts`

**Interfaces:**
- Consumes: `GradientGeometricIndexer` (Task 3), `OverlayGradientRenderer` (Task 4), `GradientShape`/`GradientFillStyle` (Task 1).
- Produces (Task 6 calls this on any `DrawTarget`): `gradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void` on `DrawTarget` and all four implementers (`PaintingCanvasController`, `OverlayCanvasController`, `DrawCallBuffer`, and the test's `RecordingTarget`). These are the ONLY implementers in the repo (verified by grep for `implements DrawTarget|implements CanvasController`).

- [ ] **Step 1: Write the failing test**

In `test/brush/DrawCallBuffer.test.ts`, extend `RecordingTarget` and add a suite. Add to the imports:

```ts
import { GradientFillStyle, GradientShape } from '../../src/algorithm/gradientFill';
```

Add to `RecordingTarget` (alongside `effectCalls`):

```ts
  public gradientCalls: { shape: GradientShape; style: GradientFillStyle; seed: number }[] = [];
```

and the method:

```ts
  gradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void {
    this.gradientCalls.push({ shape, style, seed });
  }
```

Add the suite:

```ts
describe('DrawCallBuffer gradient fills', () => {
  it('replays each recorded gradientFill in order with its shape, style and seed', () => {
    const buffer = new DrawCallBuffer();
    const style: GradientFillStyle = { axis: 'vertical', rangeLow: 1, rangeHigh: 4, dither: 0 };
    const circle: GradientShape = { kind: 'circle', center: { x: 5, y: 5 }, radius: 3 };
    const rect: GradientShape = { kind: 'rect', start: { x: 0, y: 0 }, end: { x: 2, y: 2 } };
    // one call per symmetry copy of the same stroke: same style, same seed
    buffer.gradientFill(circle, style, 42);
    buffer.gradientFill(rect, style, 42);
    const target = new RecordingTarget();
    buffer.replayTo(target);
    expect(target.gradientCalls).toEqual([
      { shape: circle, style, seed: 42 },
      { shape: rect, style, seed: 42 },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/brush/DrawCallBuffer.test.ts`
Expected: FAIL — `DrawCallBuffer` has no `gradientFill`.

- [ ] **Step 3: Implement the seam**

`src/canvas/CanvasController.ts` — add the import and the method to `DrawTarget` (after `quad`):

```ts
import { GradientFillStyle, GradientShape } from '../algorithm/gradientFill';
```

```ts
  // GPU gradient fill for convex shapes (rect/circle/ellipse): one draw
  // call per shape, band+dither decided per fragment. Solid fills and
  // degenerate ranges never come through here — the brushes fall back to
  // quad()/lines() (see fillStyleDraw.ts). seed: the per-stroke dither
  // seed, identical across a stroke's symmetry copies.
  gradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void;
```

`src/canvas/paintingCanvas/ColorIndexer.ts` — add the import, a `gradientIndexer` field constructed alongside `geometricIndexer` (same `buffers.colorIndexFramebuffer` argument), and the method:

```ts
import { GradientGeometricIndexer } from './program/GradientGeometricIndexer';
import { GradientFillStyle, GradientShape } from '../../algorithm/gradientFill';
```

```ts
    this.gradientIndexer = new GradientGeometricIndexer(gl, buffers.colorIndexFramebuffer);
```

```ts
  gradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void {
    this.gradientIndexer.indexGradientFill(shape, style, seed);
  }
```

Also dispose it wherever `geometricIndexer.dispose()` is called in this file.

`src/canvas/paintingCanvas/PaintingCanvasController.ts` — add the method (after `quad`), plus the type imports:

```ts
  gradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void {
    this.colorIndexer?.gradientFill(shape, style, seed);
    this.mainCanvasRenderer?.renderCanvas();
    this.renderZoomCanvas();
  }
```

`src/canvas/overlayCanvas/OverlayMainCanvasRenderer.ts` — add a `gradientRenderer: OverlayGradientRenderer` field constructed alongside `geometricRenderer` (`new OverlayGradientRenderer(gl)`), a `gradientFill` method delegating to `renderGradientFill(shape, style, seed)`, and dispose it with the others.

`src/canvas/overlayCanvas/OverlayCanvasController.ts` — add the method (after `quad`), recording for the cycling replay like every other draw:

```ts
  gradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void {
    this.recordFrameDraw(() => this.gradientFill(shape, style, seed));
    this.mainCanvasRenderer?.gradientFill(shape, style, seed);
    this.renderZoomCanvas();
  }
```

`src/brush/DrawCallBuffer.ts` — add the field, method, and replay (replay after the quad batches, before `drawImage`):

```ts
  private gradientFills: { shape: GradientShape; style: GradientFillStyle; seed: number }[] = [];
```

```ts
  public gradientFill(shape: GradientShape, style: GradientFillStyle, seed: number): void {
    // no batching: each call is already one cheap GPU draw per shape
    this.gradientFills.push({ shape, style, seed });
  }
```

```ts
    for (const g of this.gradientFills) {
      target.gradientFill(g.shape, g.style, g.seed);
    }
```

- [ ] **Step 4: Run tests and type-check**

Run: `npm test && npm run build && npm run lint`
Expected: all clean. The build is the completeness check: any `DrawTarget` implementer missing the method fails compilation here.

- [ ] **Step 5: Commit**

```bash
git add src/canvas/CanvasController.ts src/canvas/paintingCanvas/ColorIndexer.ts src/canvas/paintingCanvas/PaintingCanvasController.ts src/canvas/overlayCanvas/OverlayMainCanvasRenderer.ts src/canvas/overlayCanvas/OverlayCanvasController.ts src/brush/DrawCallBuffer.ts test/brush/DrawCallBuffer.test.ts
git commit -m "Add the gradientFill draw primitive through both canvas stacks and the buffer"
```

---

### Task 6: Route the brushes through gradientFill, with the per-stroke seed

**Files:**
- Modify: `src/brush/fillStyleDraw.ts`
- Modify: `src/brush/PixelBrush.tsx` (`drawFilledRect`, `drawFilledCircle`, `drawFilledEllipse`)
- Modify: `src/brush/CustomBrush.tsx` (same three methods)
- Modify: `src/overmind/undo/actions.ts` (`setUndoPoint`)

**Interfaces:**
- Consumes: `DrawTarget.gradientFill` (Task 5), `GradientShape` (Task 1).
- Produces: `drawGradientFilledShape(shape: GradientShape, canvas: DrawTarget): boolean` and `newGradientSeed(): void`, exported from `src/brush/fillStyleDraw.ts`.

- [ ] **Step 1: Add the seed and the routing helper**

In `src/brush/fillStyleDraw.ts`, add `GradientShape` to the existing `gradientFill` import, and append:

```ts
// The per-stroke dither seed for GPU gradient fills. One value covers a
// whole stroke: every symmetry copy and every preview redraw of the same
// drag reads the same seed (identical speckle), and setUndoPoint re-rolls
// it when the stroke commits (fresh speckle for the next fill). See
// docs/superpowers/plans/2026-07-23-gpu-gradient-fill.md, "Seed lifecycle".
let gradientSeed = Math.random() * 1000;

export function newGradientSeed(): void {
  gradientSeed = Math.random() * 1000;
}

// Routes a convex filled shape through the GPU gradient path. Returns false
// when the caller should use its CPU path instead: solid mode, or a
// single-color range — bucketPointsByGradient's degenerate case already
// paints those correctly (everything gets rangeLow, which is NOT the
// current painting color).
export function drawGradientFilledShape(shape: GradientShape, canvas: DrawTarget): boolean {
  const style = overmind.state.fillStyle.effectiveFillStyle;
  if (!style || style.rangeHigh - style.rangeLow <= 0) {
    return false;
  }
  canvas.gradientFill(shape, style, gradientSeed);
  return true;
}
```

- [ ] **Step 2: Branch the six brush methods**

In `src/brush/PixelBrush.tsx`, add `drawGradientFilledShape` to the `./fillStyleDraw` import and prepend the branch to each filled-shape method (`drawFilledPolygon` is deliberately NOT touched):

```ts
  public drawFilledRect(start: Point, end: Point, canvas: DrawTarget): void {
    if (drawGradientFilledShape({ kind: 'rect', start, end }, canvas)) {
      return;
    }
    drawFilledQuad(start, end, canvas, overmind.state.tool.activePaintColor);
  }
```

```ts
  public drawFilledCircle(center: Point, radius: number, canvas: DrawTarget): void {
    if (drawGradientFilledShape({ kind: 'circle', center, radius }, canvas)) {
      return;
    }
    const filledCircleAsLines = filledCircle(center, radius);
    drawFilledLines(filledCircleAsLines, canvas, overmind.state.tool.activePaintColor);
  }
```

```ts
  public drawFilledEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    canvas: DrawTarget
  ): void {
    if (drawGradientFilledShape({ kind: 'ellipse', center, radiusX, radiusY, rotationAngle }, canvas)) {
      return;
    }
    const filledEllipseAsLines = filledEllipse(center, radiusX, radiusY, rotationAngle);
    drawFilledLines(filledEllipseAsLines, canvas, overmind.state.tool.activePaintColor);
  }
```

Apply the identical three branches to `src/brush/CustomBrush.tsx`'s `drawFilledRect`/`drawFilledCircle`/`drawFilledEllipse` (they carry a "DPaint just draws the filled shape as if using a pixel brush" comment and currently call the same `drawFilledQuad`/`drawFilledLines` helpers — keep those calls as the fallback exactly as in PixelBrush).

- [ ] **Step 3: Re-roll the seed on stroke commit**

In `src/overmind/undo/actions.ts`, add the import and one line at the top of `setUndoPoint` (next to the existing `endEffectStroke` call — same "every committed stroke ends here" funnel):

```ts
import { newGradientSeed } from '../../brush/fillStyleDraw';
```

```ts
export const setUndoPoint = (context: Context): void => {
  // every committed stroke ends here — also the effect chains' reset point
  paintingCanvasController.endEffectStroke();
  newGradientSeed(); // next gradient fill gets fresh dither speckle
```

- [ ] **Step 4: Verify in the browser**

Run: `npm test && npm run build`, then `npm start` and on http://localhost:3000:

1. Right-click the filled-rect tool → Fill Style → Gradient, pick Range 1. Drag a filled rect, circle, and ellipse: gradient renders in preview while dragging and commits on release. This is the first time the Task 2 GLSL actually compiles — a black shape or console shader error means a GLSL bug.
2. Fill Style → Solid: all three shapes paint exactly as before (CPU path).
3. Select a range whose start equals its end (single color) — expect the old flat `rangeLow` fill, via the CPU path.
4. Filled polygon with Gradient on: still works (CPU path, untouched).
5. Undo/redo across a gradient fill: committed pixels restore correctly (they're ordinary indexed pixels in the snapshot).

- [ ] **Step 5: Commit**

```bash
git add src/brush/fillStyleDraw.ts src/brush/PixelBrush.tsx src/brush/CustomBrush.tsx src/overmind/undo/actions.ts
git commit -m "Route filled rect/circle/ellipse gradients through the GPU path with a per-stroke seed"
```

---

### Task 7: End-to-end verification and docs

**Files:**
- Modify: `docs/superpowers/plans/2026-07-23-gpu-gradient-fill.md` (status note at top)

**Interfaces:** none — verification and bookkeeping.

- [ ] **Step 1: Full suite**

Run: `npm test && npm run build && npm run lint`
Expected: all clean.

- [ ] **Step 2: Run the design doc's verification list**

Work through the 8-step Verification section of `docs/superpowers/plans/2026-07-23-gpu-gradient-fill.md` in the running app (CDP or manual):

1. All three shapes × all three axis modes vs CPU output (same look; pixels differ).
2. Edge-coverage parity: GPU circle/ellipse footprint vs `filledCircle`/`filledEllipse` — accept ±1 px along the edge or adjust the inside test's rounding if visibly off against the unfilled variant.
3. Seed semantics: two identical fills → different speckle; one drag → stable preview that matches its commit.
4. True symmetry: two copies with pixel-identical (translated) speckle.
5. Performance: `window.__redpaintBench`-session-style before/after for a large gradient circle at order-6 mirrored symmetry — cost should stop scaling with shape area.
6. Cycling integration: Tab-cycle mid-drag — the gradient preview animates (the overlay replay re-issues the one recorded `gradientFill`).
7. Regression: flood fill and filled-polygon gradients unchanged.
8. Suite/build/lint clean (Step 1 above).

- [ ] **Step 3: Update the design doc**

Add below the design doc's title: `Status: implemented <date>; verified per the list below (<note the edge-parity decision made in step 2.2>).`

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-07-23-gpu-gradient-fill.md
git commit -m "Mark GPU gradient fill implemented in the design doc"
```
