# What each DPaint version added

From the Amiga manuals' own "What's New" chapters
(`docs/reference/dpaint-manuals/`, local only — see the memory note or that
folder's README). Kept because redpaint is a re-imagining of DPaint II, and
knowing which version a feature arrived in says whether it is in scope, adjacent,
or a different program.

**✅ built · ◐ partly · ○ not built** — redpaint's position, not DPaint's.

## II → III (1989)

- ○ **Animation.** Multiple frames with flip playback, built frame by frame, by
  moving a brush through 3D space, or by painting while the frames flip
  ("animpainting"). An animation can be picked up as a brush.
- ○ **Extra Halfbrite**, with its own paint mode and two fill types.
- ○ **Overscan painting**, not just an overscan-sized page.
- ◐ **Tint** and **Extra Halfbrite** brush modes; **Tint, Brush, Wrap,
  Halfbrite** fill types. We have the mode set from II plus effects.
- ○ **Fill outward to the background color** (Alt-click the fill tool), for
  filling across a gradient.
- ✅ Continuous Freehand split into freehand and **filled freehand**.
- ✅ **Filled and outlined shapes** in one gesture. Ours is the Filled/Unfilled
  gadget halves rather than Alt-click.
- ◐ **Brush handle** in any corner *or* an arbitrary offset. Ours is II's
  centre/corner toggle (docs/brush-handle.md); III generalises it.
- ○ **Edge** — add or remove a one-pixel brush outline.
- ○ **Stencils affect pickup**: the brush selector takes only what the stencil
  has not locked.
- ○ **AutoTransp** — if a selection's four corners share a color, that is the
  transparent color instead of the background. A better rule than ours.
- ✅ **Choose Font requester** on right-click, with a preview.
- ✅ **Flip** the whole picture without picking it up as a brush.

## III → IV (1991)

- ○ **HAM**, Lo-Res or Interlace, all 4096 colors, implemented throughout.
  Translucency and Process exist to exploit it. Our answer to the same problem is
  true color (docs/true-color-mode.md).
- ○ **Color Mixer** in the palette, with PICK to take the result.
- ○ **Palettes as files** — load and save palettes and color sets independently
  of a picture, and Arrange to reorder. The obvious next step for the Palette
  cluster, which can install a brush's palette or the default but not one from
  disk.
- ✅ **Ranges** over the whole color set (docs/color-cycling.md).
- ◐ **Two more cycling styles**: colors outside the palette in a range, and one
  register cycling through many colors.
- ◐ **Five gradient kinds** in Fill Type. We have gradient fills with dither and
  jitter.
- ○ **Antialias**, three levels (None/Low/High, Alt-/). Not a paint mode: it
  sits in the Effect menu with Stencil and Perspective and stacks with whichever
  mode is painting, so it cannot be a ninth entry in MODE_ORDER
  (docs/text-tool.md).
- ○ **Process** and **Translucency** for tinting on the fly — Effect menu
  settings too, and active alongside a mode rather than instead of one.
- ○ **Mix** brush mode — brush color mixes with what is on screen.
- ○ **Stencil by painting** the mask with any tool; Tolerance in HAM.
- ○ **Animation Control Panel**; add/copy/delete frames; saved "moves";
  **LightTable** for key-framing; **Metamorphosis**, tweening two brushes into an
  AnimBrush.
- ◐ **256-color ILBM** loading. We load ILBM; the depth question is the screen
  format's.

## IV → V (1995)

- ◐ **24-bit color** through a backing store: load, edit and save 24-bit IFF.
  Ours is true color in the same raster, tagged per pixel.
- ○ **ARexx** — scripting and recordable macros.
- ○ **Natural media** (water colour, oils, chalk) and textured backgrounds.
- ◐ **Airbrush** with adjustable radius and realistic spray.
- ○ **Corral pickup** — freehand brush pickup.
- ○ **Seed-fill pickup** — a magic wand that lifts an object on a click. We
  already have the algorithm (`algorithm/floodfill.ts`); this is a second caller.
- ○ **Pressure-sensitive tablet**, cycling pressure, size and translucency.
- ○ Animation: any-size anims, camera moves, per-frame palettes, per-frame rate,
  translucency ramps across a move, interactive key-frame positioning.
- ○ **Gradient translucency** controls, better dithering in all modes.
- ○ Picture previews, DeluxePlayer, printing and interface work.

## The toolbox never changed

Worth stating once, because it settles a question that otherwise comes up per
feature. All four versions ship the **same eighteen gadgets in the same nine
rows**, in `CTRPAN.C`'s order: dotted freehand, continuous freehand, straight
line, curve, fill, airbrush, rectangle, circle, ellipse, polygon, brush
selector, text, grid, symmetry, magnify, zoom, undo, clear. Confirmed against
DP2's Handbuch, DP3's reference contents, DP4's Toolbox index and DP5's figure
8.1 — identical, down to which gadget pairs with which.

Everything the later versions added arrived on menus and requesters. So a
feature's version says nothing about whether it deserves a toolbox gadget: none
of them ever did.

## Where the line sits

**The objective is DPaint II parity.** Everything below that line is the measure;
everything above it is optional and judged one feature at a time.

From III, the painting additions are the plausible ones — brush Edge,
stencil-aware pickup, AutoTransp, fill-to-background. Its interface wins are
mostly already in.

**Animation is out of scope**, and it is the bulk of III, IV and V: frames, an
anim brush type, a player, a file format. Taking it would make this an animation
package.

Of the rest, HAM answers a problem true color already solves here. Palette files
and the Color Mixer are the parts of IV worth having, and attach to the palette
editor. Antialias, Process and Translucency would attach to the mode machinery
without joining it.
