# The palette a brush was made under — design

Status: built — the storage, DPaint's Picture ▸ Color control pair, and its
Brush ▸ Change Color submenu.

## Why a brush needs one at all

A brush holds palette **indices**, not colors — the same indexed pipeline the
canvas uses. So changing the palette silently recolors every brush in hand, in a
slot, or parked in Previous. Nothing is lost, but nothing says what the brush
used to look like either.

DPaint has the same property and the same answer: record the palette that was in
effect when the brush was made, and offer both ways out of a mismatch — move the
palette to the brush, or move the brush to the palette.

## What DPaint kept

`SHORT LoadBrColors[32]` (`PRISM.C:122`), commented "colors loaded with the
brush". Written in exactly two places:

- **`DoSelBr`** (`MODES.C:279`) — capture. Right after setting the handle, it
  does `GetColors(LoadBrColors)`: a brush picked up off the canvas records the
  picture's palette as surely as a loaded one records the file's.
- **the brush loader** (`DPIO.C:298`) — seeded with the current palette so a
  file with fewer planes has defaults, then filled from the file's CMAP.

Read by three:

- **`BrRemapCols`** (`REMAP.C:159`) — Brush ▸ Change Color ▸ Remap. The source
  palette to remap *from*, then overwritten with the current one.
- **`UseBrPalette`** (`CURBRUSH.C:30`) — Picture ▸ Color control ▸ Use Brush
  Palette. Stashes the current palette in `prevColors`, then installs the
  brush's as the picture's.
- **`RestorePalette`** (`PRISM.C:331`) — the sibling item below it, a plain
  `LoadCMap(prevColors)`.

It is **one global**, describing whatever brush is in hand; picking up another
overwrites it.

## What is built

`CustomBrush.palette` — the palette this brush's indices mean. Set on capture
(`fromCanvasArea`) and on load (the requester knows which palette the brush was
resolved into: the file's if adopted, the current one if remapped, none for
True Color, which has no indices to interpret). Carried through `transform()`,
because reshaping moves pixels without reinterpreting them — and since a slot
recall is an identity transform, that is also what keeps a stored brush's
palette with it.

**Per brush rather than one global.** The only real difference from DPaint, and
it costs nothing: brushes live in slots here, so a brush recalled long after a
palette change still knows its own, where DPaint's single global would have been
overwritten by whatever was picked up since.

`Use Brush` and `Restore` in the Picture drawer are the pair above.
Both gadgets are disabled whenever they would do nothing, and say which of the
three cases they are in: nothing to work with, already in step, or live. Restore
is idempotent — DPaint's is a plain `LoadCMap(prevColors)`, neither clearing nor
swapping — so without that it would sit enabled after use, re-applying the
palette already on screen.

Restore installs the remembered palette whatever has happened to the palette
since, so after a hand edit it is not the undo of Use Brush it might read as: it
drops the edit too. Its wording says so. Nothing invalidates the record on an
edit, which is DPaint's behaviour as well (the palette editor never writes
`prevColors`; only Use Brush Palette, a picture load, and `DefaultPalette` do)
and the right call anyway — a single edited slot should not quietly remove the
only route back to a brush's palette. The cost is bounded: a palette editor
session commits one undo point, and an undo entry carries the palette.

`palette.previousPalette` is `prevColors`, written by `rememberPreviousPalette`
from the two places a brush's palette displaces the picture's: Use Brush, and
the load requester's own Use Brush Palette, which does the same thing before the
brush is even installed.

Deliberately not from everything that replaces a palette wholesale. DPaint
stashes on picture load too (`DPIO.C:99`), but an undo entry here carries the
palette with it, so a picture load or a screen conform is already one undo away.
A brush load changes no pixels and so takes no undo point, which makes it the
one replacement with no other way back — and the reason Restore has to cover it. Restore is idempotent and keeps its
record, so it comes back to life if the palette later moves away from the
remembered one rather than being a single-use button.

The picture's own pixels are indices too, so they recolor when the palette
moves. That is the trade the feature makes, and Restore is the way back.

**Use Brush is disabled while the brush's palette already matches the
picture's**, which is every route out of the load requester: adopting the file's
palette replaces the picture's with it, and remapping re-indexes the brush into
the picture's, so either way the two agree and the gadget could only be a no-op.
Left enabled it invites a click that does nothing visible. Disabled it says
there is nothing to put back, and it comes alive the moment the palette drifts —
a conform, New Palette From Image, an edited slot, a picture loaded with its own
CMAP — which is the situation the whole feature exists for.

That also answers what Use Brush is *for* on a loaded brush: not the moment of
loading, when there is nothing to restore, but afterwards. A loaded brush has
the stronger case, in fact — a captured brush's palette is one the document
already had, while a loaded brush's may exist nowhere else once the palette has
moved on.

A new picture (right-click CLR) clears `previousPalette` along with the brushes
themselves: what Use Brush displaced belonged to the outgoing document, and the
brush that would have justified restoring it is gone too.

## Brush ▸ Change Color

DPaint II's submenu, three items; DPaint I has the first and third
(`MENU.C:207`). All in `algorithm/brushRecolor.ts`, pure, and all routed through
`transformBrush` so they bank the pre-change brush for Restore, as the reshaping
transforms do.

A brush's holes and its background color are the same pixels — capture tags
every pixel holding the background color as transparent and zeroes the index,
which is what DPaint's mask against `curxpc` amounts to — so "the background
color" means the holes throughout.

- **Bg to Fg** (`BrBgToFg`, `BRXFORM.C:77`) — paints the holes in the foreground
  color, leaving a brush with none. The opposite end from Color mode, which
  recolors the *opaque* pixels and leaves the holes alone.
- **Swap** (DPaint II's Bg <-> Fg) — holes take the foreground color and the
  foreground-colored pixels become holes. Its own inverse, and it renames the
  transparent color to the one that just made the holes.
- **Remap** (`BrRemapCols`, `REMAP.C:159`) — re-index from `brush.palette` into
  the current one, so the brush keeps its colors rather than its slots, then
  adopt the current palette as the brush's, exactly as DPaint overwrites
  `LoadBrColors` at the end. Uses `remapColorsGreedy`, the port of DPaint's own
  `used`-bitmask assignment that brush loading already goes through, weighted by
  how much of the brush each color covers so a one-pixel color cannot take the
  slot a dominant one wants.

Remap is disabled while the brush's palette and the picture's already agree,
the same three-way answer Use Brush gives — after a load they always do, and it
could only be a no-op.

