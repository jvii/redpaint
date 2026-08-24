# TODO / future plans

Living backlog for redpaint. Roughly ordered within each section; nothing here
is scheduled. Design details live in the linked docs where they exist.

What each DPaint version added, and which of it is in scope: docs/dpaint-versions.md.
What is left for DPaint II parity, which is the objective: docs/dpaint2-parity.md.

## Near-term

- [x] **Palette editor: separate editing from painting-color selection.** The
      editor carries its own `editedColorId` (`overmind/paletteEditor/state.ts`)
      and passes `Palette` an `onSelectColor`, which it uses in place of
      `setForegroundColor` — so picking a slot to edit leaves what you paint
      with alone.
- [x] **Text tool** — typing works. A line stays live on the overlay and is
      stamped as an ordinary brush when it is finished (click away, Return,
      Escape, or another tool), which is DPaint's text-as-brush and gives it
      one undo step per line. Glyphs come from `algorithm/glyphRaster.ts`:
      no browser exposes an aliased text path, so it draws the line through
      canvas 2D at 4x and decides each output pixel on area coverage itself,
      which is what keeps the result to two colors. A whole line goes through
      one `fillText` rather than being assembled from separately rasterized
      glyphs — per-glyph assembly has to round every advance to a whole pixel
      before adding it up, and being half a pixel out on each gap in turn is
      plainly visible as uneven rhythm. `domain/PixelFont.ts` caches metrics and
      the current line.
- [x] **Text tool: font requester** — right-click either half of the Text
      gadget, as PyDPainter does. Family, size and style, in an `overmind/font`
      module shaped like `fillStyle` (snapshot on open, Cancel restores).
      Its preview renders through the real rasterizer (`useFontPreview`), not
      CSS text in the chosen family: the question at that dialog is whether a
      face survives thresholding at a given size, and a smooth DOM sample
      answers a different one. It draws 1:1 with the canvas — the buffer is the
      box divided by `displayScale`, the same window-into-the-picture the fill
      style swatch is — so a face that falls apart at a size shows it there
      first, at the size it will really be.

      **The font list is the hard part, and it is not portable.** Rendering with
      an installed family by name works in every browser and needs no
      permission, which is why the tool works everywhere today; *enumerating*
      what is installed is `queryLocalFonts()`, and that is Chrome and Edge only
      — not other Chromium browsers, not Baseline, opposed by both Safari and
      Firefox on fingerprinting grounds, and permission-gated where it does
      exist. Everywhere else the only option is to width-probe candidate family
      names against the generic fallbacks, which can only find families whose
      name was guessed in advance. So the requester is a real list on Chrome and
      Edge and a curated probed one elsewhere (`domain/systemFonts.ts`), and it
      says which of the two it is showing rather than letting the short list
      read as everything installed.
- [x] **Text tool: bundled pixel faces** — Press Start 2P (already served for
      the UI, so it costs no bytes) and Silkscreen, both public-domain-adjacent
      OFL and both drawn on an 8px grid. Measured on Arial, an outline face is
      clean at 20px and up and breaks up below that, which is why the system
      faces floor there; a face drawn on a pixel grid is all axis-aligned
      rectangles, so the coverage threshold has nothing to be ambiguous about
      and it stays crisp from 8px. Those are offered only at whole multiples of
      their grid (`BUNDLED_OUTLINE_FACES.gridSize`).

      They are loaded by their bytes through `FontFace`, not `@font-face`: the
      rasterizer has to know a face is ready before it measures anything. That
      is also all a font the user supplies would need — a dropped File gives the
      same ArrayBuffer, with no font parsing at any point.

      A true bitmap path (`.rpbf` container plus an offline converter reading
      `.hex`/`.raw`) carried unscii-8 for a while and was removed: Press Start
      2P at 8px is the same 8x8 cell to within two pixels of advance, so it
      brought a second rendering path, a bespoke asset format and a build tool
      for a face already covered. It is in the history if a face ever ships only
      as `.raw`.

- [ ] **Text tool: more bundled faces.** The highest-value text work left, and
      the cheapest: two faces ship today, both sans on an 8px grid, so there is
      nothing at all for a smaller grid or another flavour. They are also the
      only faces that render identically on every machine — measured, Windows
      and macOS agree on them to the pixel, where the same nominal system face
      does not — and the only clean answer below `SYSTEM_SIZE_MIN`
      (docs/text-tool.md, "Getting past the floor"). A 5px or 6px grid face and
      a serif-flavoured one are the obvious gaps.

      Anything pixel-gridded with a clean licence drops straight in — a
      `BUNDLED_OUTLINE_FACES` entry, the woff2, and its copyright line in
      `public/fonts/README.txt`. Worth checking each candidate in the
      requester's preview first: a face that is pixel-*styled* rather than
      pixel-gridded (Pixelify Sans) has real curves and behaves like any other
      outline, and one drawn on a larger grid (VT323, Jersey 10) breaks up below
      roughly 15 and 20px. All three were tried and dropped.

      **Topaz and the Amiga faces** (P0T-NOoDLE, MicroKnight, mO'sOul, from
      `rewtnull/amigafonts`) ship TrueType versions, so they would arrive the
      same way — but they are **GPL with the font exception**, over a design
      still marked "Topaz is © AmigaInc". The exception covers the pictures a
      user paints, not an app that ships the font: adding one means carrying the
      GPL text and dMG's notices, and means redpaint having a licence of its own
      to reason from (it has none today). Worth doing deliberately or not at
      all.

- [ ] **Text tool: widen the probed font list.** `CANDIDATES` in
      `src/domain/systemFonts.ts` is 21 web-safe names and leans macOS — eight
      Mac faces against two Windows ones, and no Segoe UI, which is Windows'
      own UI font. It is only reached where `queryLocalFonts()` is not, so this
      is exactly the Safari and Firefox experience, and a family whose name is
      not in the list cannot be found however well installed it is.

      Cheap and safe to extend: each name is confirmed by measuring it against
      three generic fallbacks, so one that is not installed simply does not
      appear, and the cost is three `measureText` calls per candidate at first
      open. Calibri, Cambria, Candara, Corbel, Franklin Gothic, Century Gothic,
      Rockwell and Bahnschrift are the obvious Windows additions. Worth a pass
      for Linux (DejaVu, Liberation, Ubuntu) at the same time.

- [x] **Brush handle** — done. A Handle setting in the Brush drawer, Center or
      Corner, where Corner is the lower right. Computed from the brush's size at
      draw time rather than stored, so changing it moves the brush already in
      hand — DPaint II's behaviour, where DPaint I only read its flag at the
      next pickup.

      A larger version remembering *which* corner each brush was picked up by,
      and carrying that through transforms, slots and the IFF GRAB chunk, was
      built and then removed as not worth its ~200 lines: a corner that can be
      computed never needs carrying. GRAB is still written so other programs
      know where the brush was held, but not read back.

      Built-in brushes stay centred throughout, as DPaint's pens did, and a
      modal transform drag holds the brush by the centre and returns to the
      resting handle on commit — those tools place the preview from the drag
      anchor, so an off-centre handle slid it out of its own bounds box.
      Design, and what the DPaint source says at each point: docs/brush-handle.md.

- [x] **Brush Save As, with IFF** — done. Saving asks every time, since a brush
      has no remembered file to write back to, and offers PNG or the Amiga one:
      an ordinary ILBM carrying `masking = 2`, a transparent colour in the BMHD
      and a `GRAB` chunk. Not GIF — nothing reads one back.

      The transparent colour is the background colour, as it is in DPaint, but
      a capture zeroes the pixels it tags, so `BrushColorIndex` keeps the number
      it was made transparent by (`derive()` exists so a transform cannot
      re-apply the tag and punch fresh holes wherever it happened to produce
      that colour). A true-colour brush is refused rather than quantized.

      Reading one back was the larger half: `.brush` in the picker, sniffed by
      its first twelve bytes, and the load dialog asking what to do with the
      CMAP it brings — use the brush's palette, or remap to the current one.
      True Color is not offered there: it would unindex the brush. Adopting a
      palette has to push it to the GL textures by hand (they do not watch
      Overmind), which is what made an adopted palette render wrong at first.

      Design, the decisions, and what DPaint's own writer did:
      docs/brush-save.md. One optional step is unbuilt: `DPIFF.C` leaves the
      BODY uncompressed at 64 pixels wide and under, which is fidelity only.
      GRAB is the centre until the handle lands (docs/brush-handle.md).

- [x] **The palette a brush was made under** — recorded on capture and on load,
      per brush rather than DPaint's single global, so one recalled from a slot
      after a palette change still knows its own. Picture ▸ Use Brush / Restore
      are DPaint's Color control pair built on it. Design, and what the DPaint
      source does at each point: docs/brush-palette.md.

- [x] **Brush ▸ Change Color** — DPaint II's three: Bg to Fg (fill the brush's
      transparent pixels with the foreground color, the opposite end from Color
      mode, which recolors the opaque ones), Swap, and Remap. Remap re-indexes
      from the brush's own palette into the current one via remapColorsGreedy,
      the same greedy assignment brush loading uses, and is disabled while the
      two already agree. All pure, in algorithm/brushRecolor.ts, and all banked
      for Restore like the reshaping transforms. DPaint II puts the same three
      in Picture's Color Control as well, applied to the picture; those exist
      too, and take an undo point each rather than banking for Restore.
      See docs/brush-palette.md.

- [ ] **Stencil.** Lock chosen colors so painting cannot touch them:
      make/free/reverse/toggle, plus Lock Foreground. A system rather than a
      menu item — it constrains fills, and in DPaint III brush pickup as well.
      The largest DPaint II gap (docs/dpaint2-parity.md).

- [ ] **Fix / Free Background.** The stencil's companion: freeze the picture as
      a background painting leaves alone.

- [ ] **Grid.** A toolbox toggle, right-click for spacing, `g` to toggle,
      snapping to 8x8 by default. Keeps a grid origin that shifts on toggle so
      the held brush does not move (DPaint's CHPROC.C does this deliberately).
      Separate from Perspective's grid.

- [ ] **Spacing requester.** Right-click the line or dotted freehand tool for
      splat spacing, absolute (pixels between) or relative (splats per line).
      Small, and the dotted freehand tool already wants it.

- [ ] **Perspective.** A 3D grid with its own spacing and movement keys, brushes
      drawn in perspective. The last of the three real DPaint II gaps: large,
      self-contained, and the least reached for.

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
- [ ] **Move the toolbox icons inline.** `src/resources/toolbar.svg` is a
      sprite of 74 symbols behind 37 CSS `background: url(...)` rules, and 21 of
      those entries are `-active-view` duplicates: second copies of the same
      drawing in another color, because a CSS background cannot inherit
      `currentColor`. Inline components get hover, disabled and pressed from one
      drawing, which is why nothing in the menu needed a variant.

      About 37 components replacing 74 symbols. Mechanical, but large enough to
      want its own pass rather than riding along with something else. The rule
      it would settle is in docs/style-guide.md ("Where an icon lives").

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
- [x] **DOM hover preview** — built, then reverted 2026-08-20. On the Windows
      test machine any per-mousemove WebGL commit presents a frame-plus late
      (all browsers), which was the real cause of the pointer lag 74b53c1
      mis-attributed to the cursor div. Measured elsewhere it saved 0.09ms a
      move — about 1% of a frame — for a second rendering path of the same
      visual across five tools. The bisection record and the still-open
      painting-throughput findings for that machine remain worth keeping:
      docs/dom-hover-preview.md.

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

- [x] **Generated palettes beyond DPaint's depths** — 64/128/256 have no
      original to copy, so DPaint's 32 lead and the rest is filled with ramps of
      eight, one per row of the palette grid. Half hold a hue and climb, a
      quarter do the same muted, and a quarter turn through a 100° arc as they
      climb, which is what a sunset or a fire is.

      Ramps rather than an even lattice because these slots are painted with as
      well as matched against: a range is what cycling animates and what shading
      a shape needs, and colours merely near each other in the palette give none
      of that. It costs accuracy — measured against a real DPaint brush, remap
      mean error 9.8 against a lattice's 8.8 — because ramps are spokes and an
      arbitrary colour can land between them. Whichever is wanted, the palette
      is per-document and can be replaced.

      Remapping was also over-eager about spreading a picture across distinct
      slots (DPaint's `REMAP.C` assigns exclusively): it now takes a second-best
      slot only within a tolerance of the nearest, so two genuinely close
      colours stop being pushed apart.

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
