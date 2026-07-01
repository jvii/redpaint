# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

dxpaint is a browser-based pixel-art paint program, a re-imagining of Amiga's Deluxe Paint (freehand,
shapes, flood fill, custom brushes, 32-color palette, undo/redo, zoom preview). Built with React 19 +
TypeScript on Create React App (react-scripts), state managed with Overmind, and all drawing done via raw
WebGL (no canvas 2D context for the actual painting).

## Commands

- `npm start` — dev server on http://localhost:3000 (CRA hot reload)
- `npm run build` — production build to `build/` (runs with `CI=` to not fail on warnings)
- `npm test` — Jest via `react-scripts test` in interactive watch mode. Note: there are currently no test
  files in `src/`.
- `npm run lint` — ESLint over `src/**/*.{ts,tsx}` (config extends `react-app`/`react-app/jest`)
- Formatting: Prettier is configured (`.prettierrc.json`: 100 col width, single quotes, ES5 trailing commas)
  but there is no `format` script — run `npx prettier --write` directly if needed.

`tsconfig.json` has `strict: false`. There are `paths` overrides pointing `react`/`react-dom` at
`node_modules` — leave these alone, they exist to work around a local linked-package setup.

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
