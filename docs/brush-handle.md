# Brush handle — design

Status: steps 1–3 built (the toggle, the capture corner, and `adjustHandle`
reading them). Steps 4 and 5 — a rule per transform, and reading `GRAB` back on
load — are not. Wanted for its own sake, and the reason a `GRAB` chunk would
have anything to carry (docs/brush-save.md).

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

## What every transform has to say about it

DPaint carries the handle through each one, and twice gives up:

| transform | rule | source |
| --- | --- | --- |
| Flip X / Y | `xoffs = w - xoffs - 1` | `BRXFORM.C:100,131` |
| Rotate 90° | swap, `xoffs = w - 1 - saved` | `ROT90.C:72` |
| Halve / Double | `xoffs >>= 1` | `BEND.C:175,184` |
| Stretch | scaled with the picture: `xoffs * newW / oldW` | `STRETCH.C:32` |
| Shear | back to `w/2`, keeping `yoffs` | `SHEAR.C:83` |
| Bend | back to `w/2`, keeping the unbent axis | `BEND.C:155` |
| Rotate any angle | back to `w/2`, commented `/* not correct but ... */` | `ROTATE.C:171` |

Stretch is the only one that carries a *meaningful* handle through, and it is
the obvious rule once seen: the handle is a position within the picture, so
scaling the picture scales it. Everything harder than that gives up and
re-centres.

Worth knowing when reading those sources: each modal transform *also* slams the
handle to the lower right while the drag is live (`IMStrBrush`, `IMShrBrush`,
`ROTATE.C:197`, `BEND.C:169`) and restores a real one when the drag ends. That
is drag geometry, not a handle rule — the corner is what the rubber-band is
anchored by.

**Here that drag-time handle is the centre, not the lower right.** Same
reasoning, different corner: these tools place the preview and the bounds box
from the drag anchor, so the preview has to sit where its own geometry says or
it slides out of the box it is being sized inside. The centre is the one that
keeps it there. The handle goes back to the corner when the drag commits, so
this is invisible except as the preview lining up.

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

1. ✅ `CustomBrush` carries the capture corner and `handle()` derives from it
   and the mode; `adjustHandle` reads that instead of halving the size. The
   mode is one app-wide flag (`brush.cornerHandle`) rather than per-brush,
   which is what makes it live on the brush already in hand — DPaint II's
   behaviour — with no recomputation anywhere.
2. ✅ `BrushSelector` records the corner the drag ended at, by DPaint's own
   `MAX(0, mx - sx)`.
3. ✅ A Handle toggle in the Brush drawer. Never disabled: it is app-wide, so
   it can be set with a built-in in hand and takes effect at the next pickup.
4. ✅ Flip, rotate 90 and stretch/halve/double carry the corner through
   (`CornerMove` in `algorithm/brushTransform.ts`); shear, bend and free
   rotation drop it and the lower-right fallback takes over. That last part is
   a deliberate divergence: DPaint re-centred there, but Handle should keep
   meaning "a corner". A modal drag holds the brush by the centre throughout
   and returns to the corner on commit, as above.
5. Only then is `GRAB` worth reading back on load.
