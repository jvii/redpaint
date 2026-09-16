# Stencil

DPaint II's **Stencil**: lock a set of colours so painting cannot touch the
pixels that had them. The largest single DPaint II gap
(`docs/dpaint2-parity.md`). Not built. This is the design note.

## What DPaint did

**Nothing in the DPaint I source** — `stencil` does not appear in it at all, so
like the Grid requester and Spacing this is a DPaint II addition and the manual
is the only reference. (`NOLOCK` in `PAINTW.C`'s imodes table is unrelated: it
means a tool cannot be latched by double-clicking, `PRISM.H:326`.)

### The one sentence that decides the architecture

> *Die Form der Schablone ist das, was kreiert und gesichert wird, nicht die
> Farbinformationen* — the **shape** of the stencil is what is created and
> saved, not the colour information (Handbuch 4-20).

A stencil is **a frozen one-bit mask**, computed once from the selected colours
at the moment you click Make. It is not a live "these colour numbers are
protected" rule. Two consequences the manual states outright:

- **Recolouring the palette does not dissolve the stencil.** The mask holds
  coordinates, not colours.
- **Newly painted pixels are not protected**, even in a locked colour — which
  is exactly why **Remake** exists: it re-derives the mask from the current
  picture using the same colour selection.

The manual also notes a stencil costs one bitplane (7-96), confirming one bit
per pixel.

### The commands

`Effects > Stencil` is a submenu:

| Command | Does |
|---------|------|
| **Make** | Opens the requester, then freezes the mask from the chosen colours |
| **Remake** | Re-freezes the mask from the current picture, same colour selection |
| **Lock FG** | Masks by *area* rather than colour — everything painted since Fix Background, whatever its colour |
| **Reverse** | Same as Invert in the requester |
| **On/Off** | `-`. Keeps the mask, suspends it |
| **Free** | Discards the mask and its memory |
| **Load / Save / Delete** | A stencil is a file, full-screen, loadable only at the position it was made |

The **requester** (Handbuch Abb. 3.1) shows the palette; clicking a colour
selects it, and colours can be clicked **on the picture itself, or in the main
palette**, not only inside the dialog. It has **Clear**, **Invert**, **Make**,
and can be dragged by its title bar — because you paint through it while it is
open. The tutorial's four clicks are Clear → colour 9 → Invert → Make: "lock
everything except colour 9".

An active stencil shows **`S`** in the menubar (4-30), beside the **`B`** that
Fix Background shows.

### Fix Background is its other half

`Effects > Background > Fix / Off` freezes the current picture as a background:

- **CLR** then erases only what has been painted *since* the fix, instead of
  the whole page.
- The command that releases it is **Off** in the DP2 Handbuch (4-22) and
  **Free** from DPaint III on (DP3 3-38, "just choose Background>Free"). Free is
  the one to use: it is where the line ended up, and it matches the Stencil
  submenu's own Free right beside it.
- The right mouse button paints "without fearing for the background".
- **Colours cannot be picked** that match the background colour while fixed.
- **Lock FG** is only meaningful with it: it makes a stencil out of everything
  painted since the fix, so the stencil becomes area-based rather than
  colour-based.

They are one feature in two menus, and Lock FG is the join.

### What later versions added

- **III**: brush pickup respects the stencil — the selector takes only what is
  not locked (`docs/dpaint-versions.md`).
- **IV/V**: paint the mask directly with any tool, and a HAM tolerance.

Both are out of DPaint II scope, and the first is one line once the mask
exists.

## How PyDPainter does it

`libs/stencil.py` is 140 lines and worth reading, because its answer is not the
obvious one and it is the answer that fits us.

It does **not** mask each write. It holds two things:

- `image` — a **copy of the canvas** taken when the stencil is made
- `mask` — the coordinates whose colour was in the locked set

and then **restores** rather than blocks:

```python
def draw(self, screen, ...):    # stencil.py:103
    screen2 = screen.copy(); screen2.blit(self.image, offset, rect)
    surf_array[mask_offset] = surf_array2[mask_offset]
```

That restore runs in two places, and the pairing is the whole design:

1. **Every frame, as a display layer.**
   `config.layers.set("fg", config.stencil, priority=10, visible=...)`
   (`config.py:1282`) composites the frozen pixels *over* the canvas on each
   recompose, so protected areas look untouched while you drag.
2. **At commit, into the real canvas.** `save_undo()` calls
   `config.stencil.draw(self.pixel_canvas)` before snapshotting
   (`config.py:1499`), so the repair is baked in and the undo history, the
   saved file and everything downstream see the protected picture.

So: paint freely, show the stencil on top, and bake the repair once per stroke.
`make`/`remake` are one line of numpy (`np.where(self.is_color[surf_array])`);
`lock_fg` is the same against a non-background test; `reverse` inverts both the
mask and the colour set.

## The design for us

**Take PyDPainter's model.** Draw-then-repair, not mask-each-write, and for the
same reason it suits them: the alternative means threading a mask through every
draw path — `ColorIndexer`, `EffectIndexer`, `DrawImageIndexer`, the gradient
and pattern indexers, flood fill — where this touches two places.

### Display: one more texture in the shader

`DrawImageRenderer`'s fragment shader is already an index→palette lookup with a
true-colour branch (`DrawImageRenderer.ts:96-122`). The stencil is a third
sampler holding the frozen picture, with **alpha 0 meaning "not protected"**:

```glsl
vec4 st = texture2D(u_stencil, uv);
vec4 pixel = mix(texture2D(u_image, uv), st, step(0.5, st.a) * u_stencilOn);
```

The mask needs no separate storage — it is the alpha channel of the frozen copy
— and the existing `isTrueColor` branch below keeps working unchanged, because
a stencil pixel is an ordinary pixel in the same encoding.

This gives the live half for free: no per-stroke work, no clearing, no
interaction with the overlay canvas, and the zoom view (which mirrors the main
canvas) gets it too.

**What it costs, since this is the hottest shader there is.** Three things get
conflated under "a branch in the common shader":

- `u_stencilOn` is **uniform across the draw**, so no warp diverges on it and
  it costs nothing.
- `st.a > 0.0` is per-pixel and *would* diverge, at the stencil's edges, where
  the cost is executing both sides. Both sides are only "which vec4 do I use",
  so `mix`/`step` above avoids the question entirely.
- The real cost is **the extra texture sample**, not the branch: one more
  fetch per fragment, around 555k per full-screen pass at a typical window.

That is nothing in absolute terms, and it matters here only because
`renderCanvas()` runs on **every brush stamp** rather than once per frame —
the bottleneck dirty-rect rendering is meant to fix — so anything added is
multiplied by stamps per second.

**Measured, and it does not.** `__redpaintBench(300, 100, 9)` — 300 stamps of a
100x100 brush, which is the full-canvas re-render the main shader sits on:

| build | min | median |
|-------|-----|--------|
| before any stencil work | 93.1 ms | 100.0 ms |
| main shader sampling the stencil | 91.0 ms | 99.6 ms |
| main and both overlay shaders sampling it | 96.8 ms | 99.8 ms |

`__redpaintBenchOverlay(400, 100, 15)` for the preview path, which runs per
pointer move rather than per stamp:

| build | min | ms/preview |
|-------|-----|------------|
| overlay shaders without the stencil | 9.6 ms | 0.024 |
| overlay shaders sampling it | 8.6 ms | 0.021 |

Medians land within half a millisecond across every build, and the sampling
ones come out *faster* on the mins — the signature of noise, not of a cost.
Read the mins: the overlay's medians are bimodal (~12 ms and ~38 ms), which is
the read-back sync the harness uses to flush the GL queue, not the shader.

So the two-variant split is **not worth building**. If a later change makes
these shaders hotter, it is still available: compile the same source twice
behind a `#define STENCIL` and bind by whether a stencil exists — no sampler,
no uniform, no branch in the common case, for one more `createProgram` at
init.

### Commit: one GPU pass before the undo snapshot

`setUndoPoint` already reads the whole canvas back
(`PaintingCanvasController.getCanvasColorIndex`). Before that read, run a
full-screen pass through the existing framebuffer path that writes the stencil
texture wherever its alpha is non-zero — the same shape as `ColorIndexer`'s
existing writes. Then the read, the snapshot, the saved file and the autosave
all see the repaired picture with no CPU round trip.

### State and storage

A `Stencil` class outside Overmind holding the frozen `CanvasColorIndex` and
the GL texture, with a reactive mirror in a small `overmind/stencil` module
carrying only what the UI needs: `active`, `enabled`, and the locked colour
set. That is `BrushSlots`'s arrangement (`src/brush/BrushSlots.ts`) and the
reason is the same — a megabyte of raster has no business behind an Overmind
proxy.

Memory is one canvas-sized `Uint8Array`, the same as one undo level.
`undoLevelsForCanvas` should account for it.

### Two things DPaint did not have to decide

**True-colour pixels.** A stencil selects *colours*, and in hybrid mode a pixel
can be literal RGB with no palette index (`docs/true-color-mode.md`), so it
belongs to no colour in the requester. The honest default is that a
true-colour pixel is **never locked by a colour selection** — it is not that
colour, it is its own — while `Lock FG` (which asks "was this painted?", not
"what colour is it?") locks them like anything else. Worth stating in the
requester rather than leaving to be discovered.

**Flood fill leaks.** Draw-then-repair means a fill spreads *underneath* a
locked region and emerges on the far side, then has the middle repaired away.
DPaint's own model would do the same — its stencil masks writes, not the
flood's propagation — and PyDPainter's certainly does. So this is faithful
rather than a defect, but it is surprising enough to be worth a line in the
docs and a test that pins it.

## Shape of the change

### New files

| File | ~Lines | What |
|------|--------|------|
| `src/canvas/Stencil.ts` | 120 | The frozen raster, its texture, make/remake/lockFg/reverse/free |
| `src/algorithm/stencilMask.ts` | 40 | Pure: `CanvasColorIndex` + locked colour set → masked copy. Tested directly |
| `src/overmind/stencil/{state,actions,index}.ts` | 80 | The reactive mirror and the menu actions |
| `src/components/stencil/StencilSettings.{tsx,css}` | 200 | The requester: palette grid, Clear, Invert, Make, Cancel |
| `test/algorithm/stencilMask.test.ts` | 60 | Colour selection, invert, true-colour pixels |

### Files touched

- `src/canvas/paintingCanvas/program/DrawImageRenderer.ts` — the third sampler
  and the branch. Perhaps fifteen lines.
- `src/canvas/paintingCanvas/PaintingCanvasController.ts` — upload the stencil
  texture; run the repair pass.
- `src/overmind/undo/actions.ts` — repair before the snapshot read.
- `src/components/menu/Menu.tsx`, `src/overmind/app/state.ts` — a fourth
  drawer. See below.
- `src/components/menu/EffectsMenu.tsx` — new, the drawer's contents.
- `src/components/menu/pixelIcons.tsx` — an `effects` icon for the tab.
- `src/components/menu/Menubar.tsx` — the `S` indicator, in the existing
  `menubar__indicators` cluster beside the Color Fill Box.
- `src/components/GlobalHotkeyManager.tsx`, `docs/keyboard.md` — `-` for
  on/off. Currently unbound.
- `src/overmind/undo/UndoBuffer.ts` — count the stencil against the budget.

Around 550 new lines and eleven files touched, the Effects drawer included. **The requester is the largest
single piece**, and most of the rest is small because the two hooks (a shader
branch, a pass before the undo read) are the whole mechanism.

### What it does not touch

Nothing in `src/tools/`, nothing in `src/brush/`, and none of the six indexers.
That is the payoff of draw-then-repair, and the reason to prefer it even though
mask-each-write is the more obvious reading of "locks colours".

## Where it goes: the Effects menu

DPaint II has six menus — Picture, Brush, Mode, **Effects**, Font, Prefs. We
have three drawers (Picture, Brush, Prefs) because Mode became the menu's
always-visible row and Font became the text tool's right-click requester, both
better homes than a menu. **Effects is the one genuinely missing**, and it is
missing for a simple reason: it holds three items and we have built none of
them.

Its whole contents, per the Handbuch's own summary (4-20) — "masks, freezing
the background, and defining planes for perspective drawing":

| Item | Submenu | Us |
|------|---------|-----|
| **Stencil** | Make, Remake, Lock FG, Reverse, On/Off, Free, Load, Save, Delete | this note |
| **Background** | Fix, Off | parity backlog, step 4 below |
| **Perspective** | Do, Center, and its own Anti-Alias and Rotation settings | backlog, optional, large |

(DPaint II's Anti-Alias is perspective-only, sharpening the rotated brush's
edges. The general three-level Antialias that `docs/dpaint-versions.md` records
is a DPaint III feature and a different thing sharing the name.)

So the drawer arrives with Stencil, gains Background at step 4, and has room for
Perspective if that is ever built. Two of three is enough to justify it; one
would not be, which is an argument for building Background alongside rather than
much later.

The cost is small — the `Drawer` union in `overmind/app/state.ts` gains
`'effects'`, `Menu.tsx` gains a fourth `Gadget` in the existing `GadgetGroup`
and a fourth conditional render, and `pixelIcons.tsx` gains one icon map. The
rail is already a radio group of three and takes a fourth without changing shape.

**Check the menubar width first.** Four drawer tabs sit beside `ScreenStatus`
in `menu__status`, and the tick and screen-name compaction earlier this year
were done because that row was tight. If a fourth tab does not fit, that is a
layout decision to make before the drawer, not after.

## Phasing

1. **Mask and display.** `stencilMask.ts`, the `Stencil` class, the shader
   branch, and a temporary way to make one (a console call, or Make against the
   current foreground colour). Nothing in the menu yet. This is the half that
   proves the design and it is testable on its own.
2. **Commit.** The repair pass before the undo read, so a saved file and the
   undo history agree with the screen. Together with (1) this is a working
   feature reachable only from the keyboard.
3. **The Effects drawer and the requester.** ✅ Done. The fourth drawer
   (`EffectsMenu.tsx`, the Workbench balloon for its tab), Make / Remake /
   Reverse / On / Free inside it, the requester (`StencilSettings.tsx`, the
   palette grid with Clear and Invert), the `S` in the menubar, and `-`. The
   reactive mirror is `overmind/stencil`; the raster stays in `canvas/Stencil`.
   Lock FG waits on Fix Background, which is what makes it mean anything.
4. **Fix Background.** ✅ Done. `canvas/Background.ts` holds the frozen picture,
   `overmind/background` mirrors the flag, CLR restores it instead of erasing,
   and **Lock FG** masks by difference from it — an area rather than a color,
   so a pixel repainted in the same color number but as true color still counts.
   `B` joins the `S` in the menubar. Both are dropped on a new picture, on a
   loaded one, and on a resize that changes the size.

   A page swap neither drops nor suspends it outright: the stencil belongs to
   the document and is shared, but **whether it applies is per page**
   (`Page.stencilOn`), so swapping away to cut a brush and back leaves it as you
   had it, while a page you have not turned it on for shows none. DPaint shares
   one stencil the same way; PyDPainter instead gives every project its own
   (`menus.py`'s swap, which copies a whole `Stencil` per project).

   Not done: DPaint II also refuses to pick a color matching the background
   while it is fixed (4-22). A narrow detail that would put a background check
   inside the color picker.

5. **Picking the colors off the picture.** ✅ Done. While the requester is open,
   clicking the canvas toggles the color under the pointer, as DPaint and
   PyDPainter both allow; right click does nothing. `StencilColorSelectorTool`
   is an ordinary selector tool, armed by `openRequester` and put back by
   `closeRequester` (whatever was selected before it is restored, so opening the
   requester cannot silently disarm a brush transform). True-color pixels are
   ignored — they hold no color number, and the stencil is built from the
   palette.

   The requester's overlay has to stop swallowing clicks for this, which is
   `Modal.tsx`'s `canvasPickable`. The chrome goes inert instead
   (`.app--canvas-picking`, mirroring how an armed crop does it), so the
   requester stays modal to everything except the picture. The palette editor
   picks its edited color the same way, through the same three pieces:
   `toolbox.enterCanvasPickMode` stashes and restores whatever selector tool was
   armed, so either requester can borrow the canvas without losing it.

   The toolbox palette is borrowed for as long as either requester is open too
   (`Palette.tsx`'s `borrowedBy`, which the Fill Style dialog now goes through
   as well): a click there toggles a lock, or moves the color being edited,
   instead of setting the paint color. Right click does nothing on any swatch
   the moment a requester is involved — a borrowed grid, or a requester's own —
   since neither is choosing paint colors.

   The lock marks stay in the requester's own grid, where each swatch keeps a
   gutter to its right and a locked color puts a black half circle into it, as
   DPaint and PyDPainter both mark them (PyDPainter draws a stepped tab, and
   gives the gutter a permanent quarter of every column - `menureq.py`'s
   `PPstencil`). The grid there is a fixed box the swatches divide, so a
   256-color palette shrinks its rows to fit instead of growing the requester
   past the screen; the marks shrink with the rows, down to a few pixels at that
   depth.

Load / Save / Delete of stencil *files* is DPaint II behaviour we can skip: it
existed because a 1988 machine could not hold much, and a stencil today is
better re-made from the picture than carried in a file. Worth recording as a
deliberate omission in `docs/dpaint2-parity.md` rather than a gap.

Brush pickup respecting the stencil (DPaint III) is one line in
`BrushSelector` once the mask exists, and is the cheapest thing on this page.

## Open: the effect modes read what is under the stencil

A locked pixel cannot be painted, but today it can still be *read*: drag Smear
across a locked shape and its color comes out the other side, smeared over the
unlocked pixels around it. The shape itself survives - the repair pass puts it
back - so nothing is damaged, but color has escaped from under the stencil,
which is not what a frisket does.

DPaint II does not allow it. Neither reference settles why:

- The vendored DPaint source is DPaint I, which has no stencil at all (nothing
  in the tree matches `stencil`). DPaint II's source is not public.
- The DP2 manual states only the write rule - "when you have a stencil for a
  particular set of colors, you cannot paint over those colors until you turn
  the stencil off" (3.19) - and its Smear entry says nothing about stencils.
- PyDPainter has our behaviour, by the same mechanism: `prim.py`'s smear never
  consults the stencil, and `config.save_undo` repairs afterwards
  (`config.py:1499`, `stencil.draw(pixel_canvas)`) exactly where we call
  `commitStencil`.

The one read PyDPainter *does* mask is brush pickup (`prim.py:450`): grabbing a
brush with a stencil on sets every locked pixel in the grabbed image to the
background color, so it comes out transparent. That is DPaint III's documented
behaviour, and it is a plausible guess at how DPaint II got the effect: a smear
brush picking up through the stencil carries nothing from the locked pixels.

### The rule

**A protected pixel is absent, not just read-only.** An effect that samples the
picture sees a hole where the stencil is, and composes its result from the
pixels it can see.

Per mode, on what each one reads (docs/reference/effects.md):

| Mode | Reads | Under the stencil |
| --- | --- | --- |
| Smear | the previous stamp's pixels (`save`) | absent: those pixels do not travel |
| Smooth | the 3x3 neighbourhood (`work`) | absent: dropped from the average, which renormalizes over the rest |
| Blend | `save` averaged with `work` | see below |
| Shade | the pixel it is about to write | nothing to decide: that pixel is protected, and the repair already restores it |
| Matte, Color, Repl, Cycle | nothing | unaffected |

Blend is the one to check against the original before deciding: DPaint II
appears to do *something* with a stencil up rather than nothing, and "absent"
has two readings for a two-sided average - drop the protected side and write
the other side unchanged, or skip the pixel entirely. Try both against DPaint II
before choosing; the table's other rows are not in doubt.

### The mechanism

Two places it can go. Both need the canvas-space coordinate the stencil is
indexed by, which the effect passes do not carry today: they render into the
stamp's rect on the color-index framebuffer, so `gl_FragCoord.xy` over a new
`u_canvasSize` gives it, the way `GeometricRenderer` already samples the stencil.

1. **Knock the holes into the scratch copies.** After `work` is filled by
   `copyTexSubImage2D` (and when `save` is taken), run a pass that writes
   `ALPHA_TRANSPARENT` wherever the stencil is not transparent. One extra pass
   per stamp, and every effect shader then needs to treat a transparent source
   texel as absent - which Smear and Blend must learn anyway, since their
   `save` already has out-of-bounds regions they skip.
2. **Sample the stencil inside each effect shader.** No extra pass, and each
   mode spells out its own "absent": Smear discards the write, Smooth drops the
   sample and divides by the count it actually used, Blend does whichever the
   check above decides.

(2) is the better fit. The three modes that care need different behaviour at a
hole, so a shared "make it transparent" pass would only hand them the same
question one indirection later, and the sample is a texture read they are
already paying for on the same units.

### Phasing

One piece of work: `u_canvasSize` plus the stencil sampler into the effect
programs, then Smear and Smooth, then Blend once its behaviour is pinned down.
Verification is the same shape as the smear check that found this: a locked band
against an unlocked one, drag across the boundary, and confirm no color from the
locked band appears outside it.

## Open: showing the stencil

A made stencil is invisible. You find out where it is by painting and seeing
what refuses to take paint, which is a poor way to check that the mask caught
what you meant - especially its edges, where a locked color meets a near-identical
unlocked one.

**Highlight the locked areas, do not dim the rest.** Dimming fails on the
picture that needs it most: a black background does not dim. And it is the wrong
metaphor - a real stencil is a sheet laid over the picture, hiding the part it
protects, so the marked area should be the protected one.

### What it looks like

- **A translucent striped sheet over the locked pixels.** Translucent because
  the color underneath is exactly what you are trying to judge; striped because
  a flat tint over a picture of flat colors reads as more picture. Diagonal
  stripes, in **screen space** (from `gl_FragCoord`, not canvas pixels) so they
  stay the same width at any zoom and never look like something painted.
- **An edge, drawn.** The boundary is the part you are checking, and a stripe
  pattern alone leaves it soft. Four neighbour samples of the stencil texture in
  the same shader: where a neighbour's protection differs from this fragment's,
  draw the line color.
- **Animated, optionally.** Marching stripes (or ants along the edge) make it
  unmistakably chrome rather than picture. It needs a repaint per frame, which
  this app otherwise does only on demand - a small driver like
  `canvas/CycleDriver.ts`, running only while the toggle is on, bumping a phase
  uniform and asking for a render. Worth doing after the static version reads
  well, not before.

### How it behaves

A **toggle**, not a peek: it stays on while you paint, which is the point - you
watch the stencil hold the line as the stroke goes over it. That makes it
display state, not a mode: no undo point, no change to the raster, nothing the
requester needs to know.

Two things it must not leak into:

- **Saved files and the autosave**, which capture the drawing buffer. Color
  cycling has the same problem and solves it with
  `CycleDriver.withBaseColors(fn)`, holding the base palette around the capture;
  this needs the same guard, turning the sheet off for the duration.
- **Brush pickup**, which reads the canvas rather than the drawing buffer, so it
  is safe as it stands - worth a check rather than an assumption.

The overlay is not involved: the sheet belongs to the picture's own display
pass, and previews are transient things drawn on top of it.

### Where it goes

`DrawImageRenderer`'s existing stencil branch, which already samples the stencil
texel for this fragment. It gains `u_stencilShow` (and later a phase), the four
neighbour samples for the edge, and the stripe function - all inside the branch
that only runs where the stencil protects. The zoom view mirrors the main
canvas's output, so it follows for nothing. A **Show** gadget in the Effects
drawer's Stencil cluster drives it, beside `On`.
