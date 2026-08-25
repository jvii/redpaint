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

## Be Square is the same correction, at a ratio shifts cannot hold

Be Square is a real and separate thing in DPaint, and it is worth being exact
about why it does not become a separate thing here.

`VMapX` is `x << xShft`. That space can say 1:1 and 2:1 and nothing else. A
320x200 Lo-Res screen on a 4:3 display is really about 1.2:1, which no shift
expresses — so DPaint calls Lo-Res square, draws a true raster circle there,
and it lands perceptibly off round. Be Square corrects that residue, which is
why the Handbuch explains it as "because the Amiga's pixels are not perfectly
square" rather than anything about Hi-Res.

A ratio held as a float has no such gap: 1.2 is not a harder number than 2. So
Be Square is not dropped for having nothing to correct — it is dropped because
once the correction is a ratio rather than a shift it is the same code, and a
toggle could only choose between correcting properly and correcting partly.


## What to change here

Convert at the tool boundary, as DPaint does — not by threading an aspect
argument through `algorithm/`. That layer is pure and fixture-tested, and its
primitives are right as they stand: a raster circle is a raster circle. The
adapters above it are where the screen gets a say (`PixelBrush` is already
described as a thin adapter).

**The ratio comes from `canvas.displayScale`, not from the format.**
`aspectX`/`aspectY` are only floors: `MainCanvas` fills the two axes
independently (`Math.max(format.aspectX, fillX)`), so the on-screen pixel shape
is set by the window and moves as it is resized — Med-Res in a 1218x850 area is
about 2.2:1, not exactly 2:1. `displayScale` is already mirrored into Overmind
for readers outside that component.

For a shape to read round, its screen extents must match: `rx * displayScale.x
== ry * displayScale.y`, so `ry = rx * displayScale.x / displayScale.y`. That
one expression covers every case above, the 1.2:1 of a true 4:3 Lo-Res
included.

- **Circle tool** — call `filledEllipse`/`unfilledEllipse` with that `ry`, and
  measure the drag radius in the corrected
  space (`RadSM`'s job) so the drag matches what appears.
- **Airbrush** (`AirbrushTool.tsx:39`) — scale the y component of its spray
  offset.
- **Symmetry** (`algorithm/symmetry.ts`) — the one place the correction has to
  reach into `algorithm/`, since the rotation happens there. Scale in, rotate,
  scale out, as `SymDo` does.
- **Built-in round brushes** (`algorithm/builtInBrushShapes.ts`) —
  `roundBitmap` already takes independent width and height, so this is only a
  question of what the caller asks for.
- **Built-in brush size drag** (`sizeBuiltInBrushTool`) — `MODES.C:196`'s
  equivalent.

Unaffected, because the drag already shows the result: rect, line, curve,
polygon, the ellipse tool, crop, flood fill.

Open: the text rasterizer has no aspect handling, so glyphs squash on Med-Res.
DPaint's bitmap fonts did not face the question. Decide it with the text tool,
not here.

## Open: should Lo-Res ever be 1.2:1?

The format table defines a Lo-Res pixel as square, which is a modelling choice
and not what an Amiga on a 4:3 monitor did. Displaying 320x200 at a true 4:3 is
what emulators do and what the artwork was drawn for, and it is the only case
where DPaint's own Be Square would have had anything to say.

Nothing here depends on the answer: the correction reads `displayScale`, so a
1.2 arrives the same way a 2 does. Worth deciding on its own merits, as a
question about how faithfully the formats model the hardware.
