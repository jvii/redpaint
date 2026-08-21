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

**A transparent colour has to be chosen.** This is the real design question.
Our transparency is per-pixel — a tag in the alpha byte, `ALPHA_TRANSPARENT`
against `ALPHA_INDEXED` — while ILBM's is "index N means transparent". So the
writer has to pick an N that the brush's own opaque pixels do not use. Suggested
rule, which mirrors how `pictureIsIndexed()` already handles the impossible
case: prefer 0, since that is what DPaint's own brushes almost always carry;
otherwise the lowest index the brush does not use; and if a brush genuinely
uses all of them, disable IFF in the requester with that as the reason.

**IFF is disabled for a brush with true-color pixels**, the same constraint the
picture has (`pictureIsIndexed`), and `toImageData` shows both kinds are
possible. That and "every index is in use" are the two independent reasons the
format is greyed out, each with its own reason shown.

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

## Suggested shape

1. **`IlbmImage` and `encodeIlbm` take masking, transparent colour and an
   optional grab.** Mechanical, and testable without a browser in
   `test/fileformat/` alongside the existing round-trips.
2. **A brush format table beside `saveFormats.ts`.** PNG keeps real alpha and
   is the lossless choice; IFF is the Amiga one. `SaveAsDialog` can be reused
   as-is if the formats and the "why this one is unavailable" predicate are
   passed in rather than imported.
3. **Extend `decodeIlbm` and route brush loading through it**, so a brush
   written here opens here.
4. Optional, for period fidelity: skip compression at 64 pixels and under, as
   DPaint did.

Deliberately not in scope: a settable brush handle, which GRAB would otherwise
be the reason to build.
