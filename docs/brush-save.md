# Saving a brush — design

Status: designed, not built. The Brush menu already has a Save gadget; this is
about giving it a requester and an Amiga format.

## What exists today

`BrushMenu.tsx#handleBrushSave` writes a PNG named `brush.png`, with no
requester and no choice: `CustomBrush.toImageData()` reads the pristine matte
bitmap through the base palette, leaves transparent pixels at alpha 0, and the
result goes straight to `saveCanvasAsPng`. It is enabled only for a captured
brush — `isSaveableBrush` excludes the built-ins, which are generated from
ASCII art and have nothing worth writing out.

The picture side is further along and is the model: `SaveAsDialog` asks for a
name and a format, `menu/saveFormats.ts` holds the three formats in one table
with the note each shows, and `pictureIsIndexed()` greys out the indexed ones
with a reason rather than accepting the choice and refusing it later.

## How DPaint saved a brush

`SaveBrsNamed()` (`docs/reference/dpaint-source/src/DPIO.C`) writes **an
ordinary FORM ILBM**. There is no brush form; three things distinguish it from
a picture:

| | |
| --- | --- |
| `BMHD.masking` | `2`, mskHasTransparentColor |
| `BMHD.transparentColor` | the brush's `xpcolor` |
| `GRAB` chunk | the handle, two INT16, written after CMAP |

Two details from `DPIFF.C`: the BODY is left **uncompressed when the brush is
64 pixels wide or less** (`w <= 64 ? cmpNone : cmpByteRun1`), and an Amiga
`.info` icon is written alongside, which has no equivalent here.

## What has to change

**The encoder hardcodes no transparency.** `ilbm.ts` writes `bmhd[9] = 0` and
`transparentColor = 0`. Both need to become inputs, and `IlbmImage` needs the
fields. `writeForm` is generic, so GRAB is a chunk like any other.

**The transparent colour is the background colour, and it needs remembering.**
A captured brush already works DPaint's way: `getBrushColorIndexFromArea` passes
`palette.backgroundColorId` as the transparent colour number, and
`BrushColorIndex.addTransparency` tags every pixel holding it. So there is
nothing to choose, and no collision to fear either — *every* pixel of that
colour became transparent, so no opaque pixel can still carry the index.

What is missing is the index itself. `addTransparency` zeroes the pixel as well
as tagging it, so a captured brush no longer knows which colour it was made
transparent by, and the current background may have changed since. Keep the
number on `BrushColorIndex` at construction; the writer then emits it for every
transparent pixel and declares it in the BMHD.

Only a brush that came from a file rather than a capture has no such number:
`fromImageData` takes its transparency from the source's alpha, and its opaque
pixels can include any index. Falling back to the current background is the
faithful answer — it is what a capture would have used — and it is worth
writing down that this is the one path where an opaque pixel could collide with
the transparent index and be read back as a hole.

**IFF is disabled for a brush with true-color pixels**, the same constraint the
picture has (`pictureIsIndexed`), and `toImageData` shows both kinds are
possible. That is the one reason the format is greyed out.

**There is no handle to write.** `CustomBrush.adjustHandle` is
`point - size/2`: the handle is always the centre, never stored and not
settable. So GRAB gets `(w/2, h/2)` until there is one — truthful rather than a
placeholder, since it is where the brush actually stamps. Reading a non-centre
GRAB back needs the handle itself: docs/brush-handle.md.

**Nothing can read these files back.** `beginBrushLoad` (`app/actions.ts`)
decodes through an `<img>` element, so it takes PNG and GIF and not IFF; only
the picture path calls `decodeIlbm`. And `decodeIlbm` ignores `masking === 2`
and drops GRAB. Writing a format the app cannot open is the wrong place to
stop, so the two belong in one change: sniff with `isIlbmHeader` as the picture
load already does, surface the transparent index from the decoder, and map it
back to `ALPHA_TRANSPARENT`.

## A loaded brush brings a palette with it

"When you load a saved brush, it comes equipped with its own palette, the one
that was in effect when the brush was first saved" (DP2 manual). That is the
part an IFF brush adds over a PNG one: a CMAP, whose indices mean nothing
against the picture's own palette. DPaint's answer is three Color-menu
commands, and on load it applies none of them — the picture's palette stays and
the brush may simply look wrong until you choose:

- **Use Brush Palette** (`CURBRUSH.C:30`) — keeps the current palette in
  `prevColors` and loads the brush's over it. Only with a custom brush held.
- **Restore Palette** (`PRISM.C:331`) — puts `prevColors` back.
- **Remap Brush** (`REMAP.C:159`) — rewrites the brush's pixels from its own
  palette to the current one, then adopts the current palette as the brush's.

Two things to take from `BrRemapCols` in particular. It **returns a new
transparent colour index** (`BMRemapCols` -> `curbr.xpcolor`), so a remap has to
carry that colour across like any other; and it bails when there is no custom
brush rather than acting on a built-in.

Half of this exists already, and in a better place: `BrushLoadDialog` offers
"keep true color" against remapping to the current palette
(`fromRemappedImageData` + `remapToIndexByColor`), asked at load rather than
left for the user to notice afterwards. What is missing is the brush *carrying*
a palette at all — without that there is no Use Brush Palette and nothing for
Restore Palette to undo. So: `CustomBrush` holds the CMAP a file brought with
it, the load dialog gains a third choice for adopting it, and Restore is what
the picture's own palette history already ought to give.

## Decisions

**Saving always asks.** A brush has no remembered file the way a picture does —
`SaveAsDialog`'s Save/Save As pair exists because a picture can be written back
where it came from, and nothing here can. So the Brush menu keeps its one
gadget, and it opens a requester for name and format every time. That the
gadget still reads "Save" is accurate rather than a shortening of "Save As".

**Loading asks too.** Our own IFF *picture* load takes the file's palette
without asking (`beginImageLoad` calls `replacePalette`), because a picture
arrives self-describing and replaces everything anyway. A brush does not: it is
dropped into a picture that already exists, and silently repainting every colour
because someone picked up a brush is a far bigger side effect. DPaint agrees —
"the picture palette will remain in effect" — but answers it with menu commands
found after the fact. The brush load dialog already asks about colour, so the
question belongs there.

**The answers depend on whether the file brought a palette**, which today means
IFF against everything else: PNG and GIF arrive through an `<img>` element as
RGBA with nothing recovered, even though a GIF has a palette of its own.

Without one, the two the dialog already offers:

- **True Color (Original)** — every pixel a true-color pixel
- **Remap To Current Palette** — nearest colour per pixel

With one, those two become DPaint's pair, and True Color drops off:

- **Use the brush's palette** — `replacePalette`, indices kept as they are
- **Remap to the current palette** — nearest colour per pixel, carrying the
  transparent colour across as `BMRemapCols` does

True Color is not an option for a brush that came with a palette, and not only
because adopting the palette already reproduces it exactly. It would convert an
indexed brush into an unindexed one, and true-color pixels are what
`pictureIsIndexed()` tests: a picture holding them cannot be written as IFF or
GIF at all. Loading an Amiga brush and thereby losing the ability to save the
picture as Amiga IFF is the wrong trade to offer, let alone to label
"Original".

Remap is the better default of the two. Adopting the brush's palette repaints
every colour in the picture, and the manual's own advice to "select Use Brush
Palette whenever you load a brush" was written for a program where the
alternative was looking at the wrong colours.

**The handle comes after this.** GRAB is written as `(w/2, h/2)` until there is
a real handle, which is true today rather than a placeholder, and read back only
once there is somewhere to put it (docs/brush-handle.md).

## Shape

1. **`IlbmImage` and `encodeIlbm` take masking, transparent colour and an
   optional grab.** Mechanical, and testable without a browser in
   `test/fileformat/` alongside the existing round-trips.
2. **`BrushColorIndex` keeps the transparent colour number** it was built with,
   instead of only tagging the pixels and discarding it.
3. **A brush format table beside `saveFormats.ts`.** PNG keeps real alpha and
   is the lossless choice; IFF is the Amiga one, unavailable for a brush with
   true-color pixels. `SaveAsDialog` can be reused as-is if the formats and the
   "why this one is unavailable" predicate are passed in rather than imported.
4. **Extend `decodeIlbm` and route brush loading through it**, so a brush
   written here opens here — carrying its CMAP onto the brush, which is what
   gives the load dialog its third answer.
5. Optional, for period fidelity: skip compression at 64 pixels and under, as
   DPaint did.
