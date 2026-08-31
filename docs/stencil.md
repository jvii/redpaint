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
vec4 pixel = (u_stencilOn && st.a > 0.0) ? st : texture2D(u_image, uv);
```

One texture read on a full-screen quad. The mask needs no separate storage —
it is the alpha channel of the frozen copy — and the existing `isTrueColor`
branch below keeps working unchanged, because a stencil pixel is an ordinary
pixel in the same encoding.

This gives the live half for free: no per-stroke work, no clearing, no
interaction with the overlay canvas, and the zoom view (which mirrors the main
canvas) gets it too.

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
- `src/components/menu/PictureMenu.tsx` — a `GadgetCluster head="Stencil"`.
- `src/components/menu/Menubar.tsx` — the `S` indicator, in the existing
  `menubar__indicators` cluster beside the Color Fill Box.
- `src/components/GlobalHotkeyManager.tsx`, `docs/keyboard.md` — `-` for
  on/off. Currently unbound.
- `src/overmind/undo/UndoBuffer.ts` — count the stencil against the budget.

Around 500 new lines and eight files touched. **The requester is the largest
single piece**, and most of the rest is small because the two hooks (a shader
branch, a pass before the undo read) are the whole mechanism.

### What it does not touch

Nothing in `src/tools/`, nothing in `src/brush/`, and none of the six indexers.
That is the payoff of draw-then-repair, and the reason to prefer it even though
mask-each-write is the more obvious reading of "locks colours".

## Phasing

1. **Mask and display.** `stencilMask.ts`, the `Stencil` class, the shader
   branch, and a temporary way to make one (a console call, or Make against the
   current foreground colour). Nothing in the menu yet. This is the half that
   proves the design and it is testable on its own.
2. **Commit.** The repair pass before the undo read, so a saved file and the
   undo history agree with the screen. Together with (1) this is a working
   feature reachable only from the keyboard.
3. **The requester and the menu.** Make, Remake, Reverse, On/Off, Free, the `S`
   indicator, `-`.
4. **Fix Background**, which is a separate item on the parity list but shares
   the frozen-copy machinery entirely: the same class holding a different
   raster, with CLR consulting it. **Lock FG** then falls out, and only then —
   it is meaningless without a fixed background.

Load / Save / Delete of stencil *files* is DPaint II behaviour we can skip: it
existed because a 1988 machine could not hold much, and a stencil today is
better re-made from the picture than carried in a file. Worth recording as a
deliberate omission in `docs/dpaint2-parity.md` rather than a gap.

Brush pickup respecting the stencil (DPaint III) is one line in
`BrushSelector` once the mask exists, and is the cheapest thing on this page.
