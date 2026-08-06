# TODO / future plans

Living backlog for redpaint. Roughly ordered within each section; nothing here
is scheduled. Design details live in the linked docs where they exist.

## Near-term

- [x] **Palette editor: separate editing from painting-color selection.** The
      editor carries its own `editedColorId` (`overmind/paletteEditor/state.ts`)
      and passes `Palette` an `onSelectColor`, which it uses in place of
      `setForegroundColor` — so picking a slot to edit leaves what you paint
      with alone.
- [ ] **Text tool.** Currently a stub (captures `window.onkeydown`, renders
      nothing useful). Needs font selection, sizing, and committing glyphs through
      the brush pipeline like DPaint's text-as-brush.
- [ ] **More canvas hotkeys.** The `hotkeysSuspended()` guard in
      `GlobalHotkeyManager` makes these cheap now. Candidates from DPaint: `b`
      brush selector, `s` symmetry, `,`/`.` FG/BG pick, `+`/`-` brush size,
      `F10` toggle toolbar. (`u` undo is done, with Ctrl/Cmd-Z, Ctrl/Cmd-Shift-Z
      and Ctrl-Y alongside it — see `useUndoHotkeys`.)
- [ ] **Menu final design.** The pull-down menu got a cleanup pass
      (bottom-aligned, spacebar toggle) but the final look/structure is undecided.
- [x] **DOM hover preview** — hovering no longer commits to the overlay
      canvas: on the Windows test machine any per-mousemove WebGL commit
      presents a frame-plus late (all browsers), which was the real cause of
      the pointer lag 74b53c1 mis-attributed to the cursor div. Design, full
      bisection record, and the still-open painting-throughput findings for
      that machine: docs/dom-hover-preview.md.

## Performance

- [ ] **Dirty-rect rendering.** The real brush-stamping bottleneck is the
      full-canvas re-render (main + zoom) after every draw call, not the stamping
      itself. Scissor the repaint to the stroke's bounding box.
      `window.__redpaintBench(stamps, brushSize, reps)` is the console harness;
      note that machine perf drifts between sessions — only compare numbers from
      the same session. Scoped by a finding elsewhere: it will not help a
      machine whose display sits behind an indirect driver, where the cost is
      per present and Lo-Res already proved pixel count irrelevant
      (docs/dom-hover-preview.md, "Painting: still slow there"). This remains
      the right fix for throughput and for Safari.
- [ ] **Memoize `symmetryCopies()` transform closures** on settings if it ever
      shows up in profiling (noted in docs/symmetry-tool.md).
- [ ] **Safari performance pass.** Safari is noticeably slower than Chrome,
      and drawing with symmetry + a large custom brush was slow enough to
      trigger a GPU context loss there (recovery is now handled, but the load
      should come down). Dirty-rect is the main fix; also revisit
      `preserveDrawingBuffer: true` on the painting canvas — it forces a
      framebuffer copy per composite, disproportionately expensive in Safari.
      That last one is now a Safari-only rationale: `preserveDrawingBuffer:
      false` was measured on the slow Windows machine and changed nothing
      there. Note too that `desynchronized: true` is disqualified while pDB
      stays — together they made painting drastically slower, so dropping pDB
      is the prerequisite for even testing it (docs/dom-hover-preview.md).

## Effects (own feature, enabled by true-color mode)

Effects design and status: docs/effects.md — the full DPaint II Mode set
(Matte, Color, Repl, Smear, Shade, Blend, Cycle, Smooth) is implemented.

- [x] **Color cycling animation** — Tab toggles display-only rotation of each
      palette range over time, independent of painting. See docs/color-cycling.md.

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
- [ ] **Animated GIF export**, as the way to get a color-cycling animation out
      of the app — the one cycling produces that no still format can carry.
      Needs an encoder of our own: `canvas.toBlob` will not write GIF at any
      quality setting, and asking it for a type it cannot encode silently
      returns PNG bytes rather than failing. Less work than it sounds — the
      frames are the cycled palettes applied to one unchanged raster, which is
      exactly what `cycledPalette` already computes and what a GIF's per-frame
      local color table is for, and `toIndexedPixels()` hands over the indices
      unchanged. `src/fileformat/ilbm.ts` is the precedent for writing a format
      by hand.

Still PNG for the plain Save, deliberately: it is lossless and indexed-friendly,
where JPEG smears exactly the hard edges this program exists to make. WebP would
save bytes and change nothing else.

## Polish / faithfulness

- [ ] **FILLCURSOR-style fill pointer**: DPaint switched to a dedicated fill
      cursor whose hotspot leaves the target pixel visible; we currently just skip
      the primary symmetry-indicator point instead.
- [ ] **PASTE_ERROR dialog reuse**: the single OK button stretches full-width
      in the new dialog button column — differentiate if it bothers.

## Infrastructure

- [x] **Autosave simplification** — all four sections done: Web Locks for tab
      identity, a per-tab restore marker in IndexedDB, a plain throttle for
      write scheduling, and the startup fit sequenced behind the restore
      instead of refereed against it. Design, the measurements each decision
      rests on, and the corrections testing forced: docs/autosave-simplification.md.
- [x] **Create React App fully retired.** `eslint.config.mjs` is a flat config
      of our own (ESLint 9, typescript-eslint 8, eslint-plugin-react-hooks 5,
      prettier last), replacing `eslint-config-react-app` — which used to be
      what pulled ESLint in at all, pinning its version and configuring jest
      for a runner this repo does not use. Also dropped: `eslint-config-react`
      and `cross-env` (declared, never referenced) and `@types/jest`. Rule
      coverage is deliberately unchanged, warning for warning.
- [ ] **Widen test coverage.** `src/persistence/` is covered now — 35 cases over
      tab identity (reload keeps its id, a duplicate whose lock is held takes a
      fresh one, and detection independent of navigation type) and the document
      store (round trip, record validation, the restore marker's set/clear/
      interrupted sequence, pruning by age and count and the marker/record
      prefix split). `test/fakeIndexedDb.ts` and `test/fakeWebLocks.ts` are the
      hand-rolled stand-ins, alongside `test/png.ts`.

      Still browser-only: the write scheduler in `useDocumentAutosave` (a hook,
      so it needs a React harness this repo does not have yet — extracting the
      throttle's decision as a pure function is the cheap way in), the startup
      fit sequencing, and everything WebGL. The CDP scripts remain the check for
      those.
