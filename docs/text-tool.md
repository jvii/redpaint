# Text tool

Typing places a live line on the overlay; it is committed to the picture as an
ordinary brush stamp on click elsewhere, Return, Escape or a change of tool.
PyDPainter's model (`DoText`), not DPaint I's, which committed each character as
it was typed and so had to erase to the background colour to take one back.

`src/algorithm/glyphRaster.ts` turns a font into 1-bit pixels,
`src/domain/PixelFont.ts` caches that and adds the underline and outline passes,
`src/tools/TextTool.tsx` runs the interaction.

## Why the pixels are decided here

No browser exposes an aliased text path. Canvas anti-aliases in *coverage* — the
edge pixel's alpha says how much of the glyph covered it, whatever colour was
asked for. `imageSmoothingEnabled` governs image scaling, and the CSS
font-smoothing properties do not reach `fillText`.

So the browser is used only as an outline rasterizer, at a size where its own
anti-aliasing no longer biases the shape: draw at `SUPERSAMPLE`× the wanted
size, then set an output pixel where at least half its subsamples were covered.
That is area coverage, the rule an aliased rasterizer applies. Thresholding a 1×
render instead would inherit both the browser's anti-aliasing and its lack of
hinting.

`SUPERSAMPLE = 4` gives each output pixel 16 coverage levels. Three other ways
to sharpen the result were measured and are not worth retrying:

- Choosing the sub-pixel baseline phase that best fits the outline to the grid,
  as a stand-in for hinting. Best case 0.6% fewer undecided pixels at 12px, and
  at 16px phase 0 already won.
- Counting each subsample as covered/not before summing, to be immune to any
  gamma in the browser's text alpha. Indistinguishable — the alpha is near
  enough to linear coverage.
- Moving the threshold. Swept 0.35–0.60 at 11px: below 0.45 counters close up,
  above 0.50 bowls break.

**The floor.** Below roughly 12px this stops being enough. Outlines that small
have sub-pixel stem widths and canvas grid-fits nothing, so stems thin and break
however finely they are sampled. That is missing information, not a sampling
error, and it is why the bundled pixel faces earn their place.

## Whole-pixel glyphs

Each glyph is rasterized alone, cached, and blitted at a whole-pixel pen
position. Drawing a whole line in one `fillText` is the obvious alternative and
lets the browser place glyphs at its own sub-pixel precision — but then a glyph
meets the pixel grid at a different phase every time it appears, and
thresholding those phases gives different pixels. Measured across one line of
ordinary text at 24px: Georgia produced ten distinct `g`s, Verdana eight, Arial
five, with stems a pixel wider in one word than the next. Sub-pixel placement is
right for anti-aliased text and wrong here, where a glyph is a shape the user
expects to recognise.

Two consequences, both accepted:

- **Kerning is lost.** The browser applies pair kerning only when it lays out a
  whole string. Predictable letterforms are worth more to a pixel-art tool.
- **Neighbouring gaps can differ by a pixel.** The pen is kept fractional and
  only its *position* is rounded. Rounding each advance in turn would
  accumulate — a face whose `n` is 8.4px wide would put every one at 8, and a
  word of them comes out visibly short. Rounding the running total keeps a line
  within half a pixel of the font's metrics however long it gets.

Rasterizing per glyph also takes the expensive pass off the keystroke path: a
128px line costs about 1.2ms per keystroke rather than 18ms.

## Room for the outline

`outlineRun` grows a glyph by a pixel on every side, so two rings meet in every
gap.

- **Between letters**, `OUTLINE_TRACKING`-style tracking of 2px is added to each
  advance in outline mode only. Without it a pair the font set two pixels apart
  comes out with its rings touching, and along a baseline they fuse into one
  band.
- **Between lines**, `lineAdvance` adds 3px, and does so in *both* styles.
  Spacing that changed with the style would reflow a paragraph typed half in
  each and move lines already on the canvas.

The vertical direction needs one pixel more than the horizontal because letters
carry side bearings — there is already a column of background to spend on the
rings — while lines carry no such guarantee. Press Start 2P sets its line box to
exactly its ink height at every size, which leaves nothing to spend.

## What text does not take

- **Paint modes.** DPaint's text ignored them (`TEXT.C` blits JAM1 and consults
  no mode). Here they had nothing useful to say to a single stamp either: Smear,
  Blend and Smooth are defined by being dragged and have no second point, Shade
  found nothing to step, and all four made the line vanish outright. Matte,
  Color and Repl were already indistinguishable for a run whose bitmap is
  FG-colorized either way. A run goes to `drawImage`, never
  `CustomBrush.stamp`.
- **Symmetry.** A run never goes through `symmetryBrush`, so the mode can be
  armed and does nothing — which is DPaint's behaviour.
- **The screen format's pixel aspect.** Text in Med-Res displays half as wide,
  the way everything else drawn here does. DPaint's own text never consulted the
  screen mode, and no tool in this app does. PyDPainter corrects for it only
  because it swapped the bitmap font for a scalable one and had to choose a
  ppem.

## Anti-aliasing, if it is ever wanted

Not as a paint mode. Later DPaint made Antialias a setting beside the modes
rather than one of them, and for text specifically the better route is
PyDPainter's: let the browser render the glyphs anti-aliased and quantize that
to the palette — or keep it as it is, once there are true-color pixels to keep
it in (`docs/true-color-mode.md`).

## What it does not take (input)

- **IME composition.** A keystroke is taken only when `event.key` is a single
  character, and during composition it is `Process`, so CJK input does nothing.
  A decision rather than an oversight: handling it means a `compositionend`
  path and a live pre-edit shown somewhere, and the tool has no room for one.
- **Combining marks.** The line is iterated by code point, so a decomposed
  `e` + U+0301 rasterizes the mark as its own glyph at the pen rather than
  where the font would place it. Keyboard input is composed, so this is
  currently unreachable; anything that pastes into the line would reach it, and
  the fix is `Intl.Segmenter` at grapheme granularity in place of the `for..of`.

## Fonts

Two sources, both reaching `ctx.font` the same way:

- **Bundled** (`src/domain/BundledFonts.ts`), served from `public/fonts` and
  registered with `FontFace` + `document.fonts.add()` — no parsing of the font
  file at any point. The same path a user-supplied `.ttf` would take, since a
  dropped `File` gives the identical `ArrayBuffer`. Each is drawn on a pixel
  grid, which is the whole reason to carry a font: a pixel-gridded face is
  nothing but axis-aligned rectangles, so the coverage threshold has nothing
  ambiguous to resolve. Only whole multiples of that grid are offered as sizes.
- **Installed** (`src/domain/systemFonts.ts`), from `queryLocalFonts()` where it
  exists (Chromium desktop, permission-gated) and otherwise a probe of guessed
  names, measured against the generic fallbacks. The requester says which it is
  showing, because a probed list cannot be read as everything installed.

Two traps, both of which have already been paid for once:

- **A family the document already declares must not be registered again.**
  `index.html` declares Press Start 2P as two `unicode-range` subsets for the
  UI. Adding a `FontFace` for that family does not replace them — it joins them,
  with no `unicode-range`, competing for every character, and the app's chrome
  relaid out mid-session. Bundled faces the document provides carry no `url`.
- **Canvas does not trigger font loading.** Only DOM text does, so a face
  split into `unicode-range` subsets can be missing the subset a character
  needs — Press Start 2P's latin-ext is not loaded by any UI text, and `ā`
  measured against the fallback rather than the face. Thresholding that would
  cache the fallback's pixels under the family's own key for good, so
  glyphCell asks for the load and both caches are dropped on `loadingdone`.
  (`ä` and `ö` are U+00E4/U+00F6, inside the latin subset the chrome already
  loads, so they were never affected.)
- **`document.fonts.check()` is not a load guard.** It answers "would this
  render without waiting", which is *true* for a family nothing has registered —
  there is nothing to load, so a fallback is ready immediately. Used as a guard
  it skips every load and leaves every bundled face silently substituted.

`ctx.font` and CSS `font-family` both need the family name quoted: an unquoted
name must be a sequence of valid CSS identifiers, and a word starting with a
digit is not one, so `"Press Start 2P"` fails to parse. The assignment is then
*silently dropped* and the context keeps the font it had — which reads as one
face's metrics being reported for another rather than as an error.
