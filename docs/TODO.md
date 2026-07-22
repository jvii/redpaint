# TODO / future plans

Living backlog for redpaint. Roughly ordered within each section; nothing here
is scheduled. Design details live in the linked docs where they exist.

## Near-term

- [ ] **Palette editor: separate editing from painting-color selection.** The
  editor should carry its own `editedColorId` and use an embedded palette
  variant that doesn't call `setForegroundColor` — picking a slot to edit must
  not change what you paint with.
- [ ] **Text tool.** Currently a stub (captures `window.onkeydown`, renders
  nothing useful). Needs font selection, sizing, and committing glyphs through
  the brush pipeline like DPaint's text-as-brush.
- [ ] **More canvas hotkeys.** The `hotkeysSuspended()` guard in
  `GlobalHotkeyManager` makes these cheap now. Candidates from DPaint: `b`
  brush selector, `s` symmetry, `u` undo, `,`/`.` FG/BG pick, `+`/`-` brush
  size, `F10` toggle toolbar.
- [ ] **Menu final design.** The pull-down menu got a cleanup pass
  (bottom-aligned, spacebar toggle) but the final look/structure is undecided.

## Performance

- [ ] **Dirty-rect rendering.** The real brush-stamping bottleneck is the
  full-canvas re-render (main + zoom) after every draw call, not the stamping
  itself. Scissor the repaint to the stroke's bounding box.
  `window.__redpaintBench(stamps, brushSize, reps)` is the console harness;
  note that machine perf drifts between sessions — only compare numbers from
  the same session.
- [ ] **Memoize `symmetryCopies()` transform closures** on settings if it ever
  shows up in profiling (noted in docs/symmetry-tool.md).
- [ ] **Safari performance pass.** Safari is noticeably slower than Chrome,
  and drawing with symmetry + a large custom brush was slow enough to
  trigger a GPU context loss there (recovery is now handled, but the load
  should come down). Dirty-rect is the main fix; also revisit
  `preserveDrawingBuffer: true` on the painting canvas — it forces a
  framebuffer copy per composite, disproportionately expensive in Safari.

## Effects (own feature, enabled by true-color mode)

Effects design and status: docs/effects.md — the full DPaint II Mode set
(Matte, Color, Repl, Smear, Shade, Blend, Cycle, Smooth) is implemented.

- [ ] **Color cycling animation** — palette ranges already exist
  (`PaletteRange`, used by Gradient Fill, and by the Cycle paint mode), and
  Cycle now steps through them per stamp; this is the separate feature of
  animating a range's colors over time regardless of painting. Designed:
  docs/color-cycling.md (display-only rotation, Tab toggle, per-range
  rate/active/reverse with CRNG round-trip).

## Images and palettes

- [ ] **Strict indexed mode** as a writer constraint (picker quantizes, image
  open remaps, effects resolve to palette) — storage/shaders/undo stay
  single-path.
- [ ] **Quantized image import**: median cut / octree palette extraction +
  optional ordered dithering → fully indexed image that can be recolored and
  cycled.
- [ ] **Paged palette UI** if editing 256 colors gets unwieldy (later DPaints
  paged their palette requester). 256 is the deliberate cap — larger palettes
  considered and rejected; hybrid true color covers the rest.

## Polish / faithfulness

- [ ] **FILLCURSOR-style fill pointer**: DPaint switched to a dedicated fill
  cursor whose hotspot leaves the target pixel visible; we currently just skip
  the primary symmetry-indicator point instead.
- [ ] **PASTE_ERROR dialog reuse**: the single OK button stretches full-width
  in the new dialog button column — differentiate if it bothers.

## Infrastructure

- [ ] **Migrate off Create React App** (Vite) and update Node tooling. CRA is
  dead upstream; blocks dependency upgrades.
- [ ] **Tests.** There are none (`npm test` finds no test files). The pure
  layers are very testable: `algorithm/` (shape, floodfill, symmetry),
  `domain/` (CanvasColorIndex/BrushColorIndex packing and tags).
