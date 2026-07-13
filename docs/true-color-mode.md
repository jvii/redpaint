# True Color Mode — design notes

Goal: keep growing toward DPaint II-level functionality, but also make redpaint
usable for everyday quick image edits — which means not being limited to 256
indexed colors. Indexing full-color images would be resource-intensive and
pointless, so instead of a separate mode-switch between "indexed image" and
"true color image", **indexed and true-color pixels coexist in the same image,
tagged per pixel**.

## Core idea

The canvas color index (`CanvasColorIndex`) is already an RGBA texture — 4
bytes per pixel with only R (the palette index) used. The unused bytes make an
in-band hybrid possible:

- **Indexed pixel**: R = palette index, as today. Rendered through the palette
  lookup, so global palette recoloring keeps working.
- **True-color pixel**: RGB = the literal color. Rendered directly, no lookup.
- **Which is which is tagged in the alpha component.** The displayed painting
  canvas has `alpha: false`, so the tag never affects what's on screen.

The fragment shaders branch on the tag:

```glsl
vec4 p = texture2D(u_colorIndexTexture, pos);
if (p.a == TAG_TRUECOLOR) {
  gl_FragColor = vec4(p.rgb, 1.0);
} else {
  gl_FragColor = texture2D(u_palette, vec2((p.r * 255.0 + 0.5) / 256.0, 0.5));
}
```

Writers (the indexers) set the tag: normal tools write indexed pixels; image
loading writes RGB with the true-color tag; future effects (blend, smear,
shade, …) can synthesize any color directly.

Nice emergent property: palette recoloring affects only the indexed pixels of
a hybrid image — paint pixel-art over a loaded photo, recolor the palette, and
only the painted pixels shift. No pure-truecolor editor can do that.

## Audit of current code (2026-07-04)

The plan's assumptions checked against the pipeline:

1. **Alpha is never read** ✓ — free to use as the tag.
2. **But alpha writes are inconsistent today**:
   - `CanvasColorIndex.createEmptyWithBackgroundColor` fills **A=0**
   - `GeometricIndexer` writes `vec4(index/255, 0, 0, 1.0)` → **A=255** for
     every painted stroke
   - `DrawImageIndexer` copies whatever alpha the brush texture carries
   Step zero of implementation: **normalize every writer** to the tag
   convention.
3. **Brush transparency collides with a naive 0/1 tag.** `DrawImageIndexer`
   discards on **R==0** ("index 0 is transparent") and
   `BrushColorIndex.addTransparency` maps the transparent color to index 0. A
   brush captured from a true-color region breaks this: pure blue
   `rgb(0,0,255)` has R=0 and would vanish. See tag encoding below.
4. **R-only comparisons must widen**: `floodFill` and
   `getColorNumberForPoint` compare only the R byte. Two true colors sharing
   an R value would flood into each other. Compare the full 4-byte pixel.
5. **Context flags** ✓ — painting canvas already `alpha: false`, overlay
   defaults to `alpha: true` (needed for compositing; harmless).
6. **Invariant to keep**: blending stays disabled while indexing so the tag
   alpha is written verbatim into the framebuffer.
7. **Shader precision**: the display shaders use `lowp` (a past optimization);
   the true-color branch likely wants `mediump` to avoid banding on photos.

## Tag encoding

Alpha is 8-bit and only two states are needed for the canvas — but brush
textures also need "transparent". Use one shared 3-state convention so canvas
and brush shaders agree:

| A value | meaning |
|---------|---------|
| 0 | transparent (brush textures only; canvas pixels are never transparent) |
| 127 | indexed: R = 0-based palette position (app-level ids stay 1-based) |
| 255 | true color: RGB = literal color |

This replaces the R==0 transparency hack, which also frees palette index 0 to
be stampable by custom brushes (a current quirk).

Note: choosing "low alpha = indexed" keeps `createEmptyWithBackgroundColor`'s
A=0 fill *almost* right; it should fill A=127 under this scheme, and old undo
snapshots normalize on the first repaint.

## The real cost: the color model

The storage/shader work above is the easy ~20%. The expensive part is that
"the active color" is a **palette id** throughout the app:
`palette.foregroundColorId`, `tool.activeColorNumber`, every
`DrawTarget.points/lines/quad(colorNumber)` signature, `GeometricIndexer`'s
`u_colorNumber` uniform, `colorizeTexture` (FG/BG brush recoloring), and the
overlay preview renderers. As soon as the FG color can be an RGB not in the
palette (the color picker will produce one the first time someone picks from a
loaded photo), a paint-color type must thread through all of it.

## Phased plan

**Status:** Phase A implemented 2026-07-04, including the previously dead
image load path (decode → `CanvasColorIndex.fromImageData`, true-color
tagged, uploaded after the canvas resize commits) and PNG save
(`canvas.toBlob` from the preserved drawing buffer). Flood fill now compares
whole 32-bit pixels (`getPixel32`/`packIndexed`); `colorizeTexture`/
`addTransparency` are stride-aware.

**Status:** Phase B implemented 2026-07-04. `PaintColor` (`types.ts`:
`index | rgb`) is the app-wide paint-color currency: `DrawTarget`
signatures, the tool state (`tool.activePaintColor`), `GeometricIndexer`
(vec4 pixel uniform, JS-packed), the overlay preview (display color resolved
on the JS side), `colorizeTexture`, and flood fill all carry it. The color
picker sets a literal RGB foreground from true-color pixels
(`palette.foregroundRgb` override, cleared by selecting any palette color; no
palette slot is highlighted while it is active). In Color mode the whole
brush shape is colorized to the paint color — including a captured brush's
true-color pixels, like DPaint — while Matte mode keeps the original colors
(colorizing always starts from the pristine matte bitmap so it never
compounds). The palette editor edits the selected slot directly and is not
concerned with the active painting color. The
**background stays palette-indexed** — it doubles as the clear color and the
brush transparency marker — so the BG picker still ignores true-color
pixels.

**Brush files (2026-07-05, requester added 2026-07-13):** brushes round-trip
through ordinary PNGs using the tag encoding. Save resolves the pristine
matte bitmap to displayable pixels (indexed through the palette, true color
directly, `ALPHA_TRANSPARENT` → PNG alpha 0). Load — Brush ▸ Open and the
clipboard "Paste as brush" both go through `beginBrushLoad` (mirroring image
loading's `beginImageLoad`), which opens `BrushLoadDialog`: a live preview
plus a choice between **True Color (original)** (`BrushColorIndex.fromImageData`,
maps PNG alpha < 128 to brush transparency and every opaque pixel to a
true-color pixel — the only behavior before the requester existed) and
**Current palette** (`BrushColorIndex.fromRemappedImageData`, indexed against
the document's palette via `remapColorsGreedy` — DPaint's `REMAP.C` greedy
per-color assignment, not a per-pixel nearest search: a brush usually has few
distinct colors, so the most frequent ones each claim their own nearest
still-unclaimed palette slot rather than every pixel searching independently
and potentially collapsing two brush colors onto the same slot). Either way,
Matte mode stamps the resulting colors (literal RGB or palette index)
verbatim and Color mode recolors the whole shape.

- **Phase A — hybrid storage, indexed tools.** Normalize alpha writes to the
  tag encoding; add the tag branch to the display shaders; widen
  flood-fill/picker pixel comparisons; image loading writes RGB + true-color
  tag. Tools still paint palette colors only. *Deliverable: load any photo at
  full color and pixel-paint on it with palette tools — most of the practical
  value.*
- **Phase B — true-color FG.** Introduce a paint-color type
  (`index | rgb`) and thread it through Overmind state, `DrawTarget`, indexer
  uniforms, overlay previews and brush recoloring. Big refactor; ship alone.
- **Phase C — effects.** Blend/smear/shade etc. synthesizing colors directly
  (set the true-color tag in the indexer). Cheap once B exists.

## Future: effects and a strict indexed mode

Sketched 2026-07-05, to be designed properly with the effects feature:

- **Effects compute RGB; a write policy resolves it.** DPaint's Smooth/Blend
  did RGB math then snapped to the nearest palette color; Shade did pure index
  arithmetic within palette *ranges* (the same ranges color cycling uses). Our
  shape: effect core produces RGB → a resolution policy returns a `PaintColor`
  (`hybrid` → rgb pixel, `indexed` → nearest palette index). Shade wants the
  range-based index path for indexed source pixels — introduce palette ranges
  (also the prerequisite for color cycling).
- **"Strict indexed mode" is a constraint, not a storage mode.** Per-pixel
  tagging means a strictly indexed image is just one with no true-color
  pixels. The mode is a project setting constraining the writers (picker
  quantizes instead of setting an RGB foreground; image open remaps; effects
  resolve to palette). Storage, shaders, undo and save stay single-path.
- **Image open with remap** = palette quantization (median cut / octree) +
  optional dithering (ordered dithering is the period-correct look) → fully
  indexed image whose palette can be recolored/cycled. Note the encoding cap:
  indices are 1-based with 0 reserved for brush transparency, so max **255**
  palette colors, not 256.
- **GPU notes:** nearest-palette matching can run in the fragment shader
  (loop over the 256×1 palette texture). Effects that read the canvas around
  the stroke need ping-pong framebuffers (WebGL cannot sample the texture
  being rendered into) — that is the real infrastructure cost of effects.

### Gradient Fill (done 2026-07-13)

Palette ranges (`PaletteRange`, `state.palette.ranges`) turned out to have
their first real consumer sooner than "prerequisite for Shade and color
cycling" above suggested: **Fill Style** (`src/components/fillStyle/`,
`src/overmind/fillStyle/`), a Solid/Gradient requester reachable by
right-clicking the flood fill button or any filled shape tool button (they
share one setting, like DPaint). Gradient fill ports DPaint II's three axis
modes (Vertical/Horizontal/Horizontal Line — the last one hugs a shape's own
per-row contour, the "3-D sphere" look) plus an ordered (Bayer matrix) dither
for band blending, deterministic rather than random per the "ordered
dithering is the period-correct look" note above.

The implementation needed no WebGL/shader changes: every draw primitive
still takes exactly one `PaintColor` per call (see `DrawTarget` in
`src/canvas/CanvasController.ts`), so gradient fill rasterizes the fill as
usual (`Point[]`/`LineH[]`, same as solid fills always have), buckets the
result by computed target color (`bucketPointsByGradient`,
`src/algorithm/gradientFill.ts`), and issues one ordinary single-color call
per bucket instead of one call total. This also composes with symmetry for
free, since `SymmetryBrush` already re-rasterizes each copy independently.

Range selection is an explicit picker in the requester rather than DPaint's
implicit "whichever range contains the current foreground color" (which
silently fell back to solid if the color wasn't in any range) — the same
kind of small, deliberate improvement over the original mechanic as
elsewhere in this doc. Deferred: "From brush" pattern fill (the type union
already anticipates a third mode) and DPaint's reverse-gradient modifier
click.

### Brush color-reduction gaps (noted 2026-07-13, unimplemented)

Two loose ends between brush loading (see "Brush files" above) and the
palette-reducing operations:

- **True Color → off should probably remap the active brush too.** Turning
  the document's True Color switch off already conforms the *canvas's* own
  true-color pixels to the palette (`CanvasColorIndex.conformedTo`), but a
  brush loaded via "True Color (original)" keeps its true-color pixels
  untouched — stamping it afterward would inject true-color pixels straight
  back into a document that's supposed to be strictly indexed now. This one
  is a real correctness gap, not just a nicety, and should eventually make
  the brush conform at the same moment the canvas does.
- **"New palette from image" doesn't consider the brush's own colors.**
  Rebuilding the palette samples canvas pixels only; a loaded-but-unstamped
  brush's colors (if absent from the canvas) are neither represented in the
  new palette nor remapped to it. Lower priority and more of a judgment call
  than a bug — DPaint has no precedent here, since its brushes were always
  already indexed and never faced this. Would need the brush's pixels folded
  into the same color census as the canvas before quantizing.

### The 256th color — reclaimed (done 2026-07-05)

255 used to come from 1-based index storage ("index 0 = brush transparency").
Brush transparency now lives entirely in the alpha tag (`ALPHA_TRANSPARENT`):
built-in brush bitmaps tag their opaque pixels at construction, the brush
shaders discard on `a == 0`, and indices are stored **0-based** (no `±1` in
the display shaders; `packIndexed`/picker/`colorizeTexture`/
`addTransparency`/`createEmptyWithBackgroundColor` convert at the storage
boundary). App-level color numbers / palette ids remain 1-based; the palette
can now grow to the full **256** colors. Larger palettes were considered and
rejected: 256 is the deliberate cap (photos have ~200k+ unique colors at
1080p, so "index everything" doesn't scale anyway; hybrid true-color covers
that case).

## Original planning notes (Finnish)

> Miten yhdistetään indexed palette ja true color kuva?
>
> True color mode
>
> Tässä moodissa indeksi voi sisältää sekä tavallisesti indeksi että koko
> värin. Se kummasta on kyse voidaan kertoa alpha-komponentissa. Tämä on
> mahdollista, koska color index on tyypiltään array, jossa jokaista pikseliä
> edustaa 4 peräkkäistä arvoa (RGBA).
>
> A:lla ei tehdä varmaankaan redpaintissa mitään, ja se voidaan kytkeä webgl
> canvaksesta pois (alpha: false). Tällöin alphan arvo ei vaikuta väriin.
> Huom. Overlay canvaksella oltava alpha: true, mutta tämä ei haittaa.
>
> Voidaan siis rendatessa katsoa, onko alpha = 0 vai 1 ja sen mukaan joko
> käyttää R-komponenttia indeksinä tai suoraan RGB arvoa. Mikäli piirrettäessä
> (indekserissä) esim. efektissä halutaan luoda suoraan jokin uusi väri,
> asetetaan alpha=1 ja RGB arvo. Kuvan latauksessa tässä moodissa luetaan kuva
> RGB arvoina ja alpha=1.
