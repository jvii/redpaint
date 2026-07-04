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
| 127 | indexed: R = palette index |
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
whole 32-bit pixels (`getPixel32`/`packIndexed`); the color picker no-ops on
true-color pixels; `colorizeTexture`/`addTransparency` are stride-aware.

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
