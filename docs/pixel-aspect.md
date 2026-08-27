# Non-square pixels

Two of the four Amiga screen formats display a pixel that is not square, so a
shape that is round in the raster is not round on screen. DPaint corrected for
this; redpaint does not yet. This is what it costs and how the original did it.

## Where it bites

`aspectX`/`aspectY` (`overmind/canvas/state.ts`) give a pixel's display shape
relative to a square Lo-Res one.

| format    | aspectX | aspectY | a raster circle looks |
| --------- | ------- | ------- | --------------------- |
| Lo-Res    | 1       | 1       | round                 |
| Med-Res   | 0.5     | 1       | 2:1 tall              |
| Interlace | 1       | 0.5     | 2:1 wide              |
| Hi-Res    | 0.5     | 0.5     | round                 |

Only the ratio matters, so Lo-Res and Hi-Res are already right and the other
two are wrong by a factor of two — not subtle.

Nothing under `algorithm/`, `tools/`, `brush/` or `domain/` reads either value
today: the whole drawing pipeline assumes square pixels.

## What DPaint did

Not a flag and not a special case per shape. It kept a **virtual coordinate
space** in which pixels are square, and converted at the boundaries —
`VMapX`/`VMapY` into it, `PMapX`/`PMapY` back out. Both are shifts, so the
space only expresses power-of-two ratios, which is exactly the 1:1 and 2:1 the
formats need (`PRISM.H:110`, `DPINIT.C:288`).

Every site that has to think about roundness or angle converts:

| location             | corrects                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `GEOM.C:104,109,115` | circle, filled circle, circle-with: when `xShft != yShft` it draws an ellipse of `PMapY(VMapX(rad))` instead |
| `PSYM.C:110-117`     | symmetry: map in, rotate, map back                                                                           |
| `MODES.C:51`         | the circle's drag radius, measured in virtual space                                                          |
| `MODES.C:361`        | airbrush radius                                                                                              |
| `MODES.C:196`        | brush size for the size drag                                                                                 |
| `CURBRUSH.C:153-154` | built-in round and square pens                                                                               |

`PSYM.C` states the pattern most plainly:

```c
dp[i].x = VMapX(pts[i].x) - xsym;
dp[i].y = VMapY(pts[i].y) - ysym;
lx = PMapX(xsym + ((ddx*cj + ddy*sj + oneHalf) >> SCF));
ly = PMapY(ysym + ((-ddx*sj + ddy*cj + oneHalf) >> SCF));
```

**`ROTATE.C` does not convert**, in its whole 201 lines: DPaint corrected
symmetry's rotation but not arbitrary-angle brush rotation. Left alone here
too — a rotated bitmap is its own artefact, and matching the original costs
nothing.

## Two layers, and only one of them touches pixels

PyDPainter separates this in a way that settles most of the questions here, and
it is worth copying.

**Draw time** takes the ratio from the screen mode. `tools.py:763` is a direct
port of `GEOM.C`:

```python
ax = config.aspectX;  ay = config.aspectY
dx = (mouseX-startX)//ax          # the drag, measured in corrected space
dy = (mouseY-startY)//ay
radius = int(math.sqrt(dx*dx + dy*dy))
if ax == ay: drawcircle(..., radius, ...)
else:        drawellipse(..., radius*ax, radius*ay, ...)
```

**Display** is a separate setting entirely: `pixel_aspect`, one of
`["square", "NTSC", "PAL"] = [1.0, 10/11, 59/54]`, doubled for lace and halved
for hi-res. It sizes the window and appears nowhere in `tools.py` or `prim.py`.

The mode table keeps both as fields on one record (`displayinfo.py:44`), which
is the clearest statement of the split anywhere in either program:

| mode | size | `aspect` (display) | `aspect_x`, `aspect_y` (drawing) |
| --- | --- | --- | --- |
| Lo-Res | 320x200 | 0.909 = 10/11 | 1, 1 |
| Med-Res | 640x200 | 0.4545 | 2, 1 |
| Interlace | 320x400 | 1.818 | 1, 2 |
| Hi-Res | 640x400 | 0.909 | 1, 1 |
| Lo-Res PAL | 320x256 | 1.0926 = 59/54 | 1, 1 |

`aspect` is the broadcast fraction times the integer factor — Med-Res is
0.909/2. The drawing pair is only ever the integer part. Note their `aspect_x`
counts units per pixel where ours states the pixel's width, so the two
conventions are reciprocal: their Med-Res 2:1 is our 0.5:1.

**Force 1:1 Pixels** swaps `sm.aspect` for the integer ratio, so it removes the
broadcast fraction and nothing else: about 10% of width on NTSC, 9% on PAL. It
never makes a hi-res pixel square, despite the name. Unchecking it is also
inert — the handler calls `resize_display()` only on the way on.

That split is the whole answer. The near-1:1 part — NTSC's 10:11, PAL's 59:54,
the ~1.2 of a Lo-Res pixel on a 4:3 screen — is a *viewing* question and never
reaches the raster. Only the integer part does.

## Be Square

DPaint II's finer correction, and a real one: the residue the shift space
cannot express, since `VMapX` is `x << xShft` and says only 1:1 or 2:1.

PyDPainter has no equivalent — nothing in `libs` or `docs` — because that
residue is the `aspect` field above, which only ever reaches the window. Baking it into
pixels cannot guarantee anything anyway: our window is freely resizable, so
there is no fixed screen geometry for a "truly round" circle to be round on.

Declined here for that reason, not for having nothing to correct. If the Amiga
display aspect is ever wanted it belongs beside the screen format as a viewing
option, in PyDPainter's shape.
## The display does not honour the format's aspect either

PyDPainter fits with a single scale and letterboxes the remainder:

```python
scale = min(max_height/screen_height, max_width/screen_width/pixel_aspect)
new_window_size = (screen_width*scale*pixel_aspect, screen_height*scale)
```

One factor for both axes, so the displayed shape is constant however the window
is resized; black bars take up the slack. DPaint had the same guarantee for
free, its screen being a fixed size.

`MainCanvas` instead computes `fillX` and `fillY` independently and uses
`aspectX`/`aspectY` only as floors, so the displayed pixel shape follows the
window. Neither mode reproduces the format. Med-Res PAL (640x256) in a 1218x850
area:

| mode | gives | the format means |
| --- | --- | --- |
| Stretch | 1.90 x 3.32, about 1.75:1 | 2:1 |
| Integer | 1x3 blocks | 1x2 |

So choosing Med-Res today changes the canvas dimensions but not the shape it is
shown at, and "pixel-perfect" scaling lands on 1x3 pixels for a format whose
pixels are 1x2.

This is upstream of everything below. Correcting the raster for a display
geometry that is never presented cannot be checked by looking at it, and a
circle would still not come out round. Worth settling first; the fix is the next section.

## The display fix — built

Two modes, replacing today's two. `stretch` stays as it is; `integer` was
replaced rather than joined, because the new mode does its job better.
Measured after the change, at every window shape tried including 1600x600 and a
window smaller than the canvas:

| format | buffer | blocks | shape |
| --- | --- | --- | --- |
| Lo-Res | 320x256 | 3x3 | 1:1 |
| Med-Res | 640x256 | 1x2 | 2:1 |
| Interlace | 320x512 | 2x1 | 1:2 |
| Hi-Res | 640x512 | 1x1 | 1:1 |

**`stretch`** — fill the pane on both axes, shape not guaranteed. What it does
now, and worth keeping: it is the most drawing area a window can give.

**`aspect`** — one integer scale `k`, blocks of `k*rx` by `k*ry`, where
`rx:ry` is the format's integer ratio (1:1, 2:1, 1:2). Whole blocks and the
right shape at once. Today's `integer` floors the two axes independently and
lands on 1x3 for a format whose pixels are 1x2, so it is worse at the very
thing it exists for; there is nothing to keep.

Margin goes around **the canvas, not the app**. PyDPainter sizes the OS window
because it is an SDL program owning the screen; our canvas already sits on a
pasteboard inside a pane, so the slack has somewhere to go and the chrome does
not move.

Native is not affected. `formatId === null` returns `{x: 1/dpr, y: 1/dpr}`
before any of this, uniform by construction, and has no format aspect to honour.

The default should move to aspect-correct: a screen format that does not show
the shape it names is not doing its job.


## The drawing fix

After the display, and only then: correcting the raster for a shape the screen
does not present cannot be checked by looking at it.

Convert at the tool boundary, as DPaint does — not by threading an aspect
argument through `algorithm/`. That layer is pure and fixture-tested, and its
primitives are right as they stand: a raster circle is a raster circle. The
adapters above it are where the screen gets a say (`PixelBrush` is already
described as a thin adapter).

**The ratio is the format's `aspectX / aspectY`** (`formatPixelAspect`) — 1 on Lo-Res and Hi-Res,
0.5 on Med-Res, 2 on Interlace.

**Not `canvas.displayScale`.** It is tempting, since it is what the screen
actually does, but `MainCanvas` fills the two axes independently
(`Math.max(format.aspectX, fillX)`) so it follows the window and moves as it is
resized. Drawing from it would make the same drag produce different pixels
depending on how the window was sized, and a saved picture would carry whatever
shape the window happened to have. The raster has to be deterministic; the
window is a viewing condition, and belongs to the display layer above.

- [x] **Circle tool** — done. `circleRadii` measures the drag in corrected
  space and returns `rx = R/aspectX`, `ry = R/aspectY`, so the circle meets the
  cursor and reads round on screen. Equal radii still take the circle
  rasterizer, as `xShft == yShft` does. Measured roundness, drag 60px right:

  | format | raster | block | on screen | roundness |
  | --- | --- | --- | --- | --- |
  | Lo-Res | 121x121 | 1x1 | 121x121 | 1.000 |
  | Med-Res | 121x61 | 1x2 | 121x122 | 0.992 |
  | Interlace | 121x241 | 2x1 | 242x241 | 1.004 |
  | Hi-Res | 121x121 | 1x1 | 121x121 | 1.000 |

  The residue is odd-diameter rounding. Before, Med-Res gave a 121x121 raster
  and 0.5 roundness.
- [x] **Airbrush** — done. `SPRAY_RADIUS` is a screen distance now, divided
  back out per axis, so the spray is round and the same size on every format.
  Measured roundness 1.009 on Med-Res and 1.045 on Interlace; Lo-Res and
  Hi-Res divide by 1 and are unchanged. The residue is the measurement, not
  the geometry — the spray is random, so a bounding box under-fills at the rim
  and needs a long hold to settle.
- [x] **Symmetry** — done. The one correction inside `algorithm/`, since the
  rotation lives there. `SymmetrySettings` carries an optional `pixelAspect`
  and `rotatePoint` scales in, rotates, scales out, as `SymDo` does; omitted
  means square, so the layer stays usable without it and its existing tests
  did not move. The mirror needs nothing: a flip about a vertical line is the
  same operation at any pixel shape. `activeSettings` supplies the aspect, so
  every caller gets it.

  Checked with a 6-fold star, one spoke horizontal, whose bounding box should
  be `1/sin 60` = 1.155 wide for tall:

  | format | raster | block | on screen | ratio |
  | --- | --- | --- | --- | --- |
  | Lo-Res | 121x105 | 1x1 | 121x105 | 1.152 |
  | Med-Res | 121x53 | 1x2 | 121x106 | 1.142 |
  | Interlace | 121x209 | 2x1 | 242x209 | 1.158 |

  Three quite different rasters, one star on screen.
- [x] **Built-in brushes** — done, round *and* square: `CURBRUSH.C:153-154`
  maps both (`RoundPen(VMapY(size))`, `SquarePen(VMapY(size))`). Dither is
  exempt, as it is there — `DOT_B` gets the raw size, a texture having no
  roundness to preserve.

  `builtInBrushForAspect` regenerates the family at a size that comes out
  square on screen. Only when the aspect is not 1:1: the generators do not
  reproduce the hand-drawn art (`roundBitmap(3,3)` is a solid block where
  dot3x3 is a plus), so switching wholesale would have changed the familiar
  shapes on every format. Applied at selection, the one place a preset becomes
  the current brush.

  **dot3x3 is exempt**, and the boundary is not arbitrary: the generator
  reproduces dot5x5 and dot7x7 exactly, but `roundBitmap(3,3)` is a solid block
  where the art is a cross. Correcting it therefore does not widen a shape, it
  replaces one — at 2:1 the cross became a 6x3 blob. The finest pen stays the
  finest pen on every format, at the price of not being square on screen.

  | format | brush | raster | block | on screen |
  | --- | --- | --- | --- | --- |
  | Lo-Res | dot7x7 | 7x7, the art | 1x1 | 7x7 |
  | Med-Res | dot5x5 | 10x5 | 1x2 | 10x10 |
  | Med-Res | dot7x7 | 14x7 | 1x2 | 14x14 |
  | Med-Res | square2x2 | 4x2 | 1x2 | 4x4 |
  | Interlace | square2x2 | 2x4 | 2x1 | 4x4 |
  | any | dot3x3 | 3x3, unchanged | - | - |

- [x] **Built-in brush size drag** — done. `dragSize` measures on screen and
  converts back per axis, `MODES.C:196`'s `MAX(VMapX(w), VMapY(h))`.

Unaffected, because the drag already shows the result: rect, line, curve,
polygon, the ellipse tool, crop, flood fill.

Open: the text rasterizer has no aspect handling, so glyphs squash on Med-Res.
DPaint's bitmap fonts did not face the question. Decide it with the text tool,
not here.

## Open: should the broadcast fraction be offered?

The format table defines a Lo-Res pixel as square, which is a modelling choice
and not what an Amiga on a 4:3 monitor did: the real figures are 10/11 for NTSC
and 59/54 for PAL. PyDPainter offers both beside square, with
`force_1_to_1_pixels` to drop back to the integer ratio.

Note this is the one place the video standard matters to shape. The integer
ratio is the same for NTSC and PAL — only the fraction differs — so we already
carry the right split: standard decides dimensions, format decides shape.

It changes nothing above. The raster stays driven by the integer ratio, and
this would multiply the display scale only, exactly as `aspect` does against
`aspect_x`/`aspect_y`. Worth deciding on its own merits, and it would fit the
aspect-correct mode as a modifier rather than a third mode.
