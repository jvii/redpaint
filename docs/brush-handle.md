# Brush handle — design

Status: designed, not built. Wanted for its own sake, and the reason a `GRAB`
chunk would have anything to carry (docs/brush-save.md).

Today the handle is always the centre: `CustomBrush.adjustHandle` is
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

## What every transform has to say about it

DPaint carries the handle through each one, and twice gives up:

| transform | rule | source |
| --- | --- | --- |
| Flip X / Y | `xoffs = w - xoffs - 1` | `BRXFORM.C:100,131` |
| Rotate 90° | swap, `xoffs = w - 1 - saved` | `ROT90.C:72` |
| Halve / Double | `xoffs >>= 1` | `BEND.C:175,184` |
| Bend | back to `w/2`, keeping the unbent axis | `BEND.C:155` |
| Rotate any angle | back to `w/2`, commented `/* not correct but ... */` | `ROTATE.C:171` |

redpaint has stretch, shear, rotate, bend horizontal and bend vertical as modal
tools, plus flip and halve/double as instant ones, so each needs an answer.
Re-centring is a legitimate one where DPaint re-centred: it is what the original
does, and the apology in `ROTATE.C` says why nothing better was obvious.

## Loading

A brush read from a file has no capture drag to derive from. DPaint I takes the
`GRAB` chunk when there is one, and otherwise `xoffs = BytesPerRow*4`,
`yoffs = Rows/2` (`DPIO.C:307`) — the right edge, vertically centred, not the
middle. Consistent with the lower-right default the toggle falls back on.

## Shape

1. `CustomBrush` carries the mode and the capture corner; `adjustHandle` reads
   them instead of halving the size.
2. Capture records which corner the drag ended at.
3. A Brush Handle toggle in the Brush menu, recomputing the current brush's
   handle both ways.
4. Each transform gets its rule, DPaint's where DPaint has one.
5. Only then is `GRAB` worth reading back on load.
