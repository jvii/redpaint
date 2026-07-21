# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

dxpaint is a browser-based pixel-art paint program, a re-imagining of Amiga's Deluxe Paint (freehand,
shapes, flood fill, custom brushes, 32-color palette, undo/redo, zoom preview). Built with React 19 +
TypeScript on Vite, state managed with Overmind, and all drawing done via raw WebGL (no canvas 2D context
for the actual painting).

## Commands

- `npm start` — Vite dev server on http://localhost:3000 (port pinned in `vite.config.ts` — every CDP
  browser-verification workflow in this project hardcodes that port)
- `npm run build` — type-checks (`tsc --noEmit`) then production build to `dist/`
- `npm run preview` — serves the production build from `dist/` locally
- `npm test` — Vitest, single run. Tests live under `test/`, mirroring `src/`'s structure rather than being
  colocated (currently only the `src/algorithm/` layer and `src/domain/Line*` — pure functions with no
  WebGL/Overmind/DOM dependency; UI/components are untested on purpose while the UI is still actively
  changing).
- `npm run lint` — ESLint over `src/**/*.{ts,tsx}` and `test/**/*.ts` (config extends `react-app`/
  `react-app/jest`, from `eslint-config-react-app`)
- Formatting: Prettier is configured (`.prettierrc.json`: 100 col width, single quotes, ES5 trailing commas)
  but there is no `format` script — run `npx prettier --write` directly if needed.
- Deploys via Netlify, config in `netlify.toml` (Node version pinned there and in `.nvmrc`).

`tsconfig.json` has `strict: false`. There are `paths` overrides pointing `react`/`react-dom` at
`node_modules` — leave these alone, they exist to work around a local linked-package setup.

## UI style guide

Before making any UI change (new components, CSS, icons, colors, typography), read
`docs/style-guide.md` — the app's retro look is held together by a small set of hard rules
(palette, chrome, typography, icon registers) that aren't otherwise derivable from the existing
code. When a change deliberately breaks one of those rules, update the guide alongside it.

## Architecture

### Rendering: two WebGL canvases, color-index pipeline

The app does **not** draw RGB pixels directly. Instead every canvas pixel stores a palette **color index**
(0–255) in a texture; a fragment shader looks that index up in a 256×1 palette texture (texture unit 1) to
produce the displayed color (texture unit 0 = the color-index texture, unit 2 = brush bitmap texture when
stamping). This indirection is what makes global palette recoloring and "matte"/color-swappable brushes
possible, and it's what gets snapshotted for undo (see below).

There are two independent canvas stacks, both implementing `CanvasController`
(`src/canvas/CanvasController.ts`):

- **`paintingCanvasController`** (`src/canvas/paintingCanvas/PaintingCanvasController.ts`) owns the real
  committed pixel data. `ColorIndexer` writes into the color-index texture via a framebuffer;
  `MainCanvasRenderer` draws the indexed texture through the palette lookup; `ZoomCanvasRenderer` mirrors
  the result into a magnified preview canvas after every draw call.
- **`overlayCanvasController`** (`src/canvas/overlayCanvas/OverlayCanvasController.ts`) owns a second,
  transparent WebGL canvas layered on top, used purely for **ephemeral live previews** (the shape being
  dragged, brush cursor, selection marquee) — it is cleared on mouse-up/leave and never holds committed
  pixels. It dispatches to three renderers: `OverlayGeometricRenderer` (solid-color preview lines/points),
  `OverlayDrawImageRenderer` (brush-stamp preview, same index→palette pattern as the main canvas), and
  `OverlaySelectionIndicatorRenderer` (samples the actual main canvas as a texture and inverts colors so
  selection outlines stay visible against any background; caches that texture keyed on
  `overmind.state.undo.lastUndoPointTime`).

Shared low-level helpers live in `src/canvas/util/`: `webglUtil.ts` (shader compilation/program linking),
`util.ts` (pixel↔clip-space coordinate conversion, half-pixel line-centering offsets, index-texture
recoloring for FG/BG brush modes).

### Tools

`src/tools/Tool.tsx` defines the `Tool` interface: mouse handlers for the real canvas (`onClick`,
`onMouseMove`, ...) mirrored by an `*Overlay` set (`onClickOverlay`, ...) plus init/exit hooks for both.
Concrete tools (`src/tools/*Tool.tsx`) hold no instance state of their own — transient interaction state
(e.g. line-tool start point, polygon vertices in progress) lives in Overmind's `tool` module. The pattern:
real-canvas handlers call `brushHistory.current.draw*(..., paintingCanvasController)` to commit pixels;
overlay handlers call the same brush methods against `overlayCanvasController` for the live preview, then
clear the overlay on mouse-down/leave. Every committed stroke ends with `overmind.actions.undo.setUndoPoint()`.
`FloodFillTool` is the exception — it pulls the whole `CanvasColorIndex`, runs the scanline flood fill in
`src/algorithm/floodfill.ts`, and pushes the resulting points straight to `paintingCanvasController.points()`.

Which tool is "live" is derived state in Overmind (`toolbox.activeTool`): a selector tool (e.g. color
picker, brush selector), if one is selected, takes priority over the selected drawing tool.

### Brushes

`src/brush/Brush.tsx` (`BrushInterface`) declares one method per shape primitive (`drawPoints`, `drawLine`,
`drawCurve`, filled/unfilled rect/circle/ellipse/polygon), each taking geometry plus a `CanvasController`
target so the same brush can paint onto either the main or overlay canvas. Two implementations:

- `PixelBrush.tsx` — rasterizes shapes via `src/algorithm/shape.ts` into `Point[]`/`Line[]` and draws
  solid single-pixel-color strokes.
- `CustomBrush.tsx` — bitmap "stamp" brush wrapping a `BrushColorIndex`; stamps the bitmap at each point via
  `canvas.drawImage()` (filled shapes fall back to `PixelBrush`-style quad/line fills). Supports FG/BG/matte
  coloring modes, tracked via a `lastChanged` timestamp so renderers know when to re-upload the brush
  texture. Built-in brushes (`BuiltInBrushFactory.tsx`) are `CustomBrush` instances built from hardcoded
  ASCII bitmaps; user-captured brushes (via the brush-selector tool) are also `CustomBrush`.

### Overmind state (`src/overmind/*`, namespaced modules)

Each module pairs `state.ts` + `actions.ts`: `app` (loading flag, paste buffer), `canvas` (resolution,
scroll/zoom focus, loaded image URL — changing resolution re-inits `paintingCanvasController`), `dialog`
(single active-dialog id), `palette` (32-color map + FG/BG ids, derived arrays/colors), `paletteEditor`
(panel open state), `toolbox` (tool registries + selected/active/previous tool, zoom/symmetry mode flags),
`tool` (per-tool transient interaction state), `brush` (selected built-in brush + Matte/Color mode).

**Undo** (`src/overmind/undo/`) does not store diffs — `UndoBuffer.ts` holds a plain array of full
`CanvasColorIndex` **whole-canvas raster snapshots**. `setUndoPoint` reads
`paintingCanvasController.getCanvasColorIndex()`, truncates history past the current index, and appends.
`undo`/`redo` actions only move `currentIndex` and bump a `lastUndoRedoTime` timestamp; the actual repaint
happens outside Overmind, in `src/components/canvas/hooks.tsx`, which watches that timestamp and calls
`paintingCanvasController.setCanvasColorIndex(...)`.

### Domain objects (`src/domain/*.ts`)

`Line` (base: two `Point`s) with axis-aligned `LineH`/`LineV` subclasses providing `asPoints()` rasterization.
`CanvasColorIndex` — width/height + `Uint8Array` index texture for the whole canvas (color number in the R
channel, Y-flipped indexing since GL textures start at the bottom); this is what gets undo-snapshotted and
what flood fill reads. `BrushColorIndex` — same idea but sized to a brush bitmap, with factories/helpers for
building from ASCII art and marking transparency.

### Algorithms (`src/algorithm/*.ts`) and testing

Everything here is pure — geometry (`shape.ts`, the actual math behind the drawing tools: line, curve,
rect, circle, ellipse, polygon, returning plain `Point[]`/`Line[]` with no canvas involved — `PixelBrush`
is just a thin adapter handing the result to a `DrawTarget`), `symmetry.ts` (DPaint-style kaleidoscope point
transforms), `quantize.ts`/`imageColors.ts` (median-cut palette extraction, exact palette/nearest-color
mapping, distinct-color census — see "Image loading" below), and `floodfill.ts` (takes its bounds from the
`CanvasColorIndex` passed in, not from Overmind — keep it that way, it's what makes it testable standalone).
This is the layer with test coverage. Tests live in `test/`, a separate tree mirroring `src/`'s structure
(`test/algorithm/shape.test.ts` tests `src/algorithm/shape.ts`, `test/domain/Line.test.ts` tests
`src/domain/Line*.ts`, etc.) rather than being colocated with source; UI is deliberately untested for now.
Shared test infrastructure (not itself a test suite) lives at the `test/` root: `test/pixelGrid.ts`,
`test/png.ts`, `test/shapeFixture.ts`.

Shape tests compare against checked-in PNG fixtures under `test/algorithm/__fixtures__/shape/` — real,
openable images (rasterize the algorithm's `Point[]`/`Line[]` output with `test/pixelGrid.ts`, compare via
`test/shapeFixture.ts#expectMatchesFixture`, which decodes both sides with the hand-rolled zero-dependency
PNG codec in `test/png.ts` rather than comparing bytes). A missing fixture, or a run with
`UPDATE_FIXTURES=1 npm test`, (re)writes the fixture instead of asserting — the golden-file workflow for a
deliberate algorithm change: regenerate, open the PNGs to confirm the shape still looks right, commit.
