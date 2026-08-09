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
- [ ] **Brush-size keys, `-` and `=`.** The last unclaimed row of DPaint's
      keyboard table: `-`/`=` step the brush size down and up, `Shift` with
      either steps twice as far. Not done with the rest (`docs/keyboard.md`)
      because it is not just a binding — there is no "resize by one step"
      action to bind to. Built-in brushes size by an armed drag
      (`sizeBuiltInBrushTool`) and custom ones only halve and double, so this
      wants an increment on both first.
- [x] **Tooltips on the toolbox gadgets** — done. Structured hover panels
      (`GadgetHint`), sharing the palette editor's callout treatment, carrying
      the tool's use, its halves, its right-click and its keys. This is what
      made the shortcuts discoverable from the UI at all; the full set and its
      reasoning is `docs/keyboard.md`.
- [ ] **Menu final design.** The pull-down menu got a cleanup pass
      (bottom-aligned, spacebar toggle) but the final look/structure is undecided.
- [ ] **`Restore…` requester**, for reaching a backup that is not this tab's
      own. Restoring is deliberately per-tab and silent: a tab gets its own
      picture back and nobody else's, because adopting the newest record read as
      the tabs being synced. That leaves a closed tab's record reachable by
      nothing until pruning takes it. A list with thumbnails in the Picture
      drawer, asked for deliberately, is the counterpart to that decision.

      It is also where a second question should be settled rather than
      separately: **whether to offer an "auto-backup to browser" switch.** The
      case against a Preferences checkbox is that it fails the same test the
      Undo Levels enum failed — a setting needs one regime where it decides
      something, and storage is already bounded, the write is cheap, and the one
      real motive (privacy on a shared machine) is better served by the
      browser's own private windows and clear-site-data, which cover everything
      rather than just the raster. It also inverts the asymmetry silent restore
      is built on: a disable toggle is a quiet, persistent *discard*, flipped
      once and regretted months later. What the request actually wants is a way
      to get rid of what is stored — which is an affordance beside the list this
      requester shows (`Saved Backup — 1.2 MB, 3 minutes ago  [ Clear ]`),
      immediate and legible rather than a promise about future behaviour. If a
      toggle is ever built anyway, it must delete the existing record, not
      merely stop writing new ones.
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
      The still encoder is done (`src/fileformat/gif.ts`), and it is most of
      this: what remains is a NETSCAPE2.0 loop block, a Graphic Control
      Extension per frame (the writer already emits one for transparency), and
      the frame loop. The frames are the cycled palettes applied to one
      unchanged raster — exactly what `cycledPalette` computes and what a GIF's
      per-frame local color table is for — so the raster compresses **once**
      and every frame reuses those bytes with its own table.

      Two things to settle when it happens: GIF delays are whole centiseconds
      and browsers clamp anything under 2cs, so the fastest cycling rates
      cannot be represented faithfully; and a True Color picture has to be
      quantized or refused, since GIF has no truecolor form at all.

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
