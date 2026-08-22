# Brush handle — design

Status: built, and deliberately smaller than what is described below. A Handle
setting of Center or Corner, where Corner is the lower right — no per-brush
handle is remembered. See "What is actually built".

Before it, the handle was always the centre: `CustomBrush.adjustHandle` was
`point - size/2`, computed on the spot and stored nowhere.

## What DPaint had

A single checkable menu item, **Brush Handle** — not a handle editor. Off (the
default) holds the brush by its centre; on holds it by a corner.

**Which corner is decided by the drag that picked the brush up**: "the brush
handle attaches itself to the ending corner in the brush creation process"
(DP2 manual). Drag down-right and it is the lower right; drag up-left and it is
the upper left. DPaint I's `DoSelBr` (`MODES.C:250`) is that rule in code —
`xoff = MAX(0, mx - sx)`, where the MAX is what collapses the up-left case
to zero.

**The toggle acts on the brush already in hand**, which is the part worth
getting right. From the DP2 tutorial: pick up a square, then "from the Edit
menu, select Brush Handle to move the arrow cursor to the lower right corner of
the brush" — and "to turn off Brush Handle and hold your brush by the center,
select Brush Handle again". So it is live in both directions, and a brush with
no drag direction to consult (loaded, transformed) takes the lower right.
DPaint I did *not* do this: `TogMidHandle` (`MENU.C:361`) only flips the flag,
which is read at the next pickup. This is a DPaint II behaviour.

That makes the handle **derived rather than stored**: a mode (centre or corner)
plus which corner the capture ended at, recomputed whenever the mode changes.
It is worth copying that way round — storing an absolute offset instead would
make the toggle unable to answer "which corner" for a brush it did not capture.

**Built-in brushes are exempt.** DPaint's pens set their own offset to `w/2`
unconditionally in `FixUpPen` (`CURBRUSH.C:47`) and never read `midHandle`, so
the toggle only ever moved a picked-up brush. That is the right rule anyway:
a pen has no capture drag to derive a corner from, and the whole point of the
small ones is that the pixel under the cursor is the one that gets painted.

## What is actually built

**The mode, and nothing per brush.** Corner means the lower right, computed
from the brush's current size. `CustomBrush.restingHandle()` is the whole of
it:

```ts
mode === 'center' || builtInFamily ? { x: w / 2, y: h / 2 } : { x: w - 1, y: h - 1 }
```

The version this document originally described also remembered *which* corner
each brush's pickup drag ended at, and carried that point through transforms,
slots and the `GRAB` chunk. It was built, measured at about 200 lines including
tests, and removed: a corner that can be computed never needs carrying, so the
per-transform rules, the clone-versus-transform distinction, the slot question
and reading `GRAB` back all existed only to move a number that the brush's own
size already answers.

What that costs is the DP2 nicety of holding a brush by the corner you happened
to drag to. Thin even in the original: DPaint I read `midHandle` only at pickup,
and DP2's own tutorial describes the result as "the lower right corner of the
brush", which is what is built here.

Two pieces survive from that work and are worth keeping:

- **A transform drag holds the brush by the centre**, whatever the setting says,
  and returns to the resting handle on commit. Those tools place the preview and
  the bounds box from the drag anchor, so an off-centre handle slides the preview
  out of the box it is being sized inside. DPaint anchored those drags at the
  lower right instead (`IMStrBrush`, `IMShrBrush`, `ROTATE.C:197`, `BEND.C:169`)
  — the same reasoning reaching a different corner. Hence `handle()` beside
  `restingHandle()`.
- **`GRAB` is still written**, from `restingHandle()` floored, as DPaint wrote
  `curbr.xoffs` (`DPIO.C:250`). It costs nothing and tells DPaint or PyDPainter
  where the brush was held. It is not read back: with no per-brush handle there
  is nowhere to put an arbitrary point, and a brush comes back held by whatever
  the setting says.

**Built-in brushes are exempt** and always centred. DPaint's pens set their own
offset to `w/2` unconditionally in `FixUpPen` (`CURBRUSH.C:47`) and never read
`midHandle`. That is the right rule regardless: the point of the small ones is
that the pixel under the cursor is the one that gets painted.

## If it ever comes back

The per-brush version is in the history, and DPaint's own rules for it are worth
keeping here rather than re-deriving:

| transform | rule | source |
| --- | --- | --- |
| Flip X / Y | `xoffs = w - xoffs - 1` | `BRXFORM.C:100,131` |
| Rotate 90° | swap, `xoffs = w - 1 - saved` | `ROT90.C:72` |
| Halve / Double | `xoffs >>= 1` | `BEND.C:175,184` |
| Stretch | scaled with the picture: `xoffs * newW / oldW` | `STRETCH.C:32` |
| Shear | back to `w/2`, keeping `yoffs` | `SHEAR.C:83` |
| Bend | back to `w/2`, keeping the unbent axis | `BEND.C:155` |
| Rotate any angle | back to `w/2`, commented `/* not correct but ... */` | `ROTATE.C:171` |

Stretch is the only one carrying a *meaningful* handle through, and the rule is
obvious once seen: the handle is a position within the picture, so scaling the
picture scales it. Everything harder gives up and re-centres.

On loading, DPaint takes the `GRAB` chunk when there is one and otherwise
`xoffs = BytesPerRow*4`, `yoffs = Rows/2` (`DPIO.C:307`) — the right edge,
vertically centred. It applies that with no reference to `midHandle`
(`DPIO.C:304`), because its handle was a stored offset and the flag was only
ever read at pickup. Any future per-brush version has to answer that: a file
recording a handle is answering exactly the question the setting asks, and the
two will contradict each other.
