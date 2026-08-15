# The spare page — design notes

**Status:** built (2026-08-13/15) — per-page undo buffers on a shared
byte budget, the `pages` store, `swap`/`j`/the Picture gadget/the `PAGE n`
readout, the conform invariant, Copy To Spare, Delete This Page, the two merges
and persistence. Supersedes part 5 of the local note `docs/local/undo-memory.md`,
which sketched the constraints; this works out the implementation and corrects
its main conclusion (the `paintingCanvasController` singleton is _not_ the
obstacle). Sources: DPaint I's `SPARE.C`, the DP2 manual, and PyDPainter, which
has the feature and made three choices worth arguing with.

**Decisions** (details in the sections named):

|                                                                                 |                                    |
| ------------------------------------------------------------------------------- | ---------------------------------- |
| "Spare" is a position (the page you are not on), never an identity              | "'Spare' is a position"            |
| The off-screen page is inert CPU-side data, never a second live canvas          | "One canvas, two pages"            |
| A page _is_ an undo history plus a cursor; its raster is the current entry      | "A page is a history"              |
| Pages are an array plus a stable index, even while the array is length 2        | "What PyDPainter does"             |
| Swap goes through `setPendingCanvasContent` + `setResolution` — no new pipeline | "The swap"                         |
| Two undo buffers, one byte budget, globally-oldest eviction                     | "Undo"                             |
| The swap is not itself undoable (departs from DPaint I)                         | "Undo"                             |
| Shared palette means every whole-canvas palette op must touch both pages        | "The one real new invariant"       |
| Second IDB key for the off-screen page, written only when it changes            | "Persistence"                      |
| A second tab is not a spare page, and shouldn't be made into one                | "Could a second tab be the spare?" |

---

## What DPaint actually did

Two sources here, and a third (PyDPainter) in the section after. These two
disagree slightly because they are different versions.

**DPaint I, `SPARE.C`** (`docs/reference/dpaint-source/src/SPARE.C`, 108 lines —
the whole feature):

```c
void SwapSpare() {
    struct BitMap mytemp;
    if (AllocSpare()) return;         /* lazily allocated on first use */
    UndoSave();
    KillCCyc();                       /* stop color cycling across the swap */
    mytemp = hidbm; hidbm = sparebm; sparebm = mytemp;
    tmp = spareXPCol; spareXPCol = curxpc;
    if (!newSpare) { CPChgBg(tmp); }  /* background color rides with the page */
    newSpare = NO;
    UpdtDisplay();
    }
```

Everything worth knowing is in those lines:

- **The swap is a pointer swap.** `hidbm` is the one variable the entire program
  paints into; the spare is a bitmap of the same shape sitting beside it.
  Nothing else in DPaint knows a spare exists.
- **Lazily allocated.** `AllocSpare` runs on first use, checks `AvailMem` for
  twice the image size, and fails with "Insufficient Memory for Spare Screen".
  An untouched spare costs nothing until you ask for it.
- **The background color is per page**, swapped alongside the bitmap
  (`spareXPCol` ↔ `curxpc`) — but `newSpare` suppresses that on the very first
  swap, so a fresh spare inherits the background you were using rather than
  index 0.
- **`UndoSave()` first**, so DPaint I's single undo level holds the departing
  page's pixels. With one shared undo slot this is the only thing it could do;
  it is not a model to copy (see "Undo").
- **`CopyToSpare`** is a straight `CopyBitMap`, and takes the background color
  with it.
- **`MergeSpare`** builds a stencil from the transparent (background) color and
  `MaskBlit`s one page onto the other — `MrgSpareFront` masks the _spare's_
  background out and lays it over, `MrgSpareBack` masks the _current_ page's
  background out and lays the spare under. Both are one undo step.

**DPaint II manual** (`docs/reference/dpaint2-manual/manual-iigs.txt`, Pict
menu p. 4.11 and §2.11) adds what the source can't tell us — the intent, and
two things DPaint I did not have:

> To move from one page to the other, press the `j` key... you will notice that
> the Palette you were using in the first page follows you to the second page.
> ...although the two pages share the same palette, you can have a different
> background color on each page. (Note: If your two background colors are
> different, your brush's transparent areas will be different if you move it
> from one page to the other.)
>
> because the Toolbox is not really part of the page (but actually sits "above"
> it), whatever tools you had selected before you switched will still be
> selected after you switch pages.
>
> When you first call it up, the spare page is the standard screen size. If you
> wish to use a larger page size on the spare page, you will need to make the
> appropriate selection from the Page Size option... Note also that a spare
> page uses up memory, even if there is nothing on it.
>
> **Delete this Page**: If you no longer wish to have memory allocated for a
> second page, use Delete this Page to delete the current page... and to
> deallocate the memory set aside for it. ...DeluxePaint asks you to confirm
> the deletion and then switches you to the other page.
>
> Pictures are saved and reloaded with all their attributes, such as palettes,
> stencils, and perspective information. **Note that the spare screen is not
> saved.**

And the reason the feature exists at all, from the custom-brush chapter:

> you can keep a selection of images on your spare page... and move the images
> over to the main page by picking them up as brushes.

So the spare is not "a second document". It is **a scratch surface belonging to
the same picture**: a place to hold brush material, try a version of something,
and merge. That framing decides most of what follows.

### "Spare" is a position, not an identity

The single most important thing to get right, and the easiest to get wrong,
because the name actively misleads. The manual defines it:

> Displays the spare page. **(By definition, the spare page is always "the other
> page," the one that is not currently displayed.)**

There is no main page. `SwapSpare` exchanges the two bitmap structs wholesale,
so after one swap the variable _named_ `sparebm` physically holds what you would
have called the main page — `hidbm` and `sparebm` name **roles, visible and
not-visible, not pages**. Every operation is positional and therefore
symmetric:

|                          | reads         | writes                                              |
| ------------------------ | ------------- | --------------------------------------------------- |
| `CopyToSpare`            | visible       | the other one                                       |
| `MrgSpareFront` / `Back` | the other one | visible                                             |
| DP2 `Delete this Page`   | —             | deletes **the current** page, switches to the other |

So invoking _Copy to Spare_ while on page two overwrites page one. That is not
a quirk; it is the whole model, and the feature reads as arbitrary until you
see it. The two asymmetries in `SPARE.C` are bookkeeping, not identity:
`spareThere` (the second bitmap is allocated lazily) and `newSpare` (a one-shot
suppressing the first background-color swap). Even allocation fails to track
identity — after the first swap the original page is the one sitting in
`sparebm`, and `FreeSpare()` (PRISM.C:202) frees whichever is currently not
visible.

Consequences for everything below, and the reason the array-plus-index model is
not merely tidier but _correct_:

- The store is **`pages`, not `spareStore`** — `pages: Page[]` and
  `currentPageIndex`. No field, type or function should be named "spare"; the
  menu labels can keep DPaint's wording since that is what users know.
- Every operation is "the current page" and "the next one", never "main" and
  "spare". Written that way, `Copy to Spare` needs no special case to behave as
  DPaint does; writing it as "copy to the spare" is what would introduce a bug.
- **Our indices are stable where DPaint's bitmaps were not.** Keeping the array
  fixed and moving the index means page 0 stays page 0 across any number of
  swaps — so we can say _which_ page you are on, which DPaint could not have
  told you even if it had wanted to. That is what makes the status indicator
  below possible.

## What PyDPainter does

A third source, and the most useful one, because it solved this problem in a
modern language with the same shape of state we have. `libs/menus.py` and
`libs/config.py` (fetched from
[mriale/PyDPainter](https://github.com/mriale/PyDPainter); not vendored
locally, unlike the DPaint sources).

**Pages are a list with an index, not a "current + spare" pair:**

```python
self.proj = [Project(), Project()]     # config.py:792 — both allocated up front
self.proj_index = 0
...
config.proj_index = (config.proj_index + 1) % len(config.proj)   # menus.py:347
```

and a `Project` (config.py:155) is a nearly-complete document — `filename`,
`filepath`, `pixel_canvas`, `modified_count`, `anim`, `layers`, `stencil`,
`indicators`. The swap (`DoSpareSwap`) writes all of those out of the globals
into `proj[i]` and reads the other one's back in.

Four things to take from this, two of them corrections to what I would
otherwise have assumed.

**1. The list-with-index shape is right, and it is free.** `(i + 1) % len` is a
swap for two pages and a rotation for N. Nothing in our design needs a
hard-coded pair either — `spareStore` should hold an array and an index even
while the array is always length 2. It costs nothing now and is the difference
between adding a third page later and rewriting the feature.

**2. They clear the undo history on every swap — and this is what to avoid.**

```python
config.clear_undo()      # DoSpareSwap, menus.py:363; also DoSpareCopy
config.save_undo()
```

`Project` has no undo field: the history is global, and swapping simply throws
it away, twice (once leaving a page, once arriving). Copy To Spare does the
same. That is the honest cost of the simple model — and it is exactly what the
"a page is a history" model below buys back for nothing, because our raster
already lives in an undo entry. **This is the strongest argument in the doc for
per-page buffers:** the alternative has been implemented, and it means every
swap costs you your undo.

**3. Page size is shared across pages there, not per page** (config.py:1577):

```python
# Crop or expand all project pixel canvas
for i in range(len(self.proj)):
    ...
    config.proj[i].pixel_canvas = new_pixel_canvas
```

A page-size change resizes every project. That contradicts the DP2 manual ("if
you wish to use a larger page size on the spare page..."), and it is a real
simplification: both pages always align, so copy and merge never have to think
about size mismatch. **I'd still keep sizes per page** — we have `copiedInto`
and its top-left-anchored crop already, the manual is explicit, and forcing a
resize of the page you are not looking at is a silent destructive edit. But it
is a defensible fallback if the merge code turns out fiddly.

**4. The background color is shared there too.** There is no `bgcolor` in
`Project`; the merges key on the one global `config.bgcolor`:

```python
config.proj[sparei].pixel_canvas.set_colorkey(config.bgcolor)   # DoMergeFront
config.pixel_canvas.blit(config.proj[sparei].pixel_canvas, (0,0))
```

So PyDPainter's front/back merges are symmetric, where DPaint I's are not
(`MakeMrgMask` keys front on `spareXPCol` and back on `curxpc`). DPaint I is
authoritative and the manual calls the per-page background out explicitly, so
keep it per page — but note that this is the one field where the two references
disagree, and PyDPainter's simplification is what you would reach for if
per-page background turns out to complicate matte brushes.

Also worth having seen: `DoMergeBack` needs a scratch surface because it
composites in the other order (blit the spare into a new image, then blit the
current page over it with its colorkey set) — a reminder that "merge in back"
is not "merge in front with the arguments swapped".

---

## One canvas, two pages

`docs/local/undo-memory.md` part 5 concluded that the real obstacle was
`paintingCanvasController` being a module singleton imported at 26 sites, and
that a spare means "a second controller instance or swapping the texture
underneath the existing one". **That framing is what makes this look expensive,
and it is avoidable.** DPaint's own answer is the third option: there is one
canvas, and the other page is data.

Two implementations were considered.

**A. The spare is inert CPU-side data.** Only the current page has a GL
texture. Swapping means taking the current page's raster out, putting the
spare's in, and resizing the canvas element if the sizes differ — all of which
the app already does on every image load, resize, crop and cross-size undo.

**B. Two live textures in `ColorIndexer`.** Swap by re-pointing the framebuffer
attachment and the source texture.

|                                                        | A: inert data                   | B: two textures                       |
| ------------------------------------------------------ | ------------------------------- | ------------------------------------- |
| Changes to `PaintingCanvasController` / `ColorIndexer` | **none**                        | page identity leaks into the GL layer |
| Changes to the 26 singleton import sites               | **none**                        | none (still one controller)           |
| VRAM                                                   | one page                        | two pages, always                     |
| Empty spare costs                                      | nothing                         | a full texture                        |
| Cost per swap                                          | one upload (+ maybe a readback) | ~free                                 |
| Still needs the resolution/element-resize path         | yes                             | yes                                   |

B buys only the swap latency, and pays for it with a permanent VRAM doubling
and a concept spread into the renderer. **Take A.** The swap is an explicit,
occasional, user-initiated act; single-digit milliseconds at Amiga formats is
not a cost anyone can perceive.

Note what A does to the "don't add new direct imports of the singleton" advice
in `docs/local/undo-memory.md` part 5: it is no longer load-bearing for this feature. It
is still good hygiene, but the spare page does not need the refactor, and the
refactor would not have made the spare page easier.

## A page is a history

The tempting model is `Page = { raster, size, backgroundColor, history }`. But
the raster is already in the history: **every committed change goes through
`setUndoPoint`, so the undo buffer's current entry is the canvas**, packed to a
byte a pixel and carrying its own palette. `useDocumentAutosave` already
exploits exactly this — it writes `undoBuffer.getItem(currentIndex)` rather
than reading the GPU back.

So:

```ts
type Page = {
  size: { width: number; height: number };
  backgroundColorId: string;
  history: UndoBuffer; // an instance, not the singleton
  currentIndex: number | null;
  // view state, parked so a swap back lands where you left it
  scrollFocusPoint: Point | null;
};
```

A page's pixels are `page.history.getItem(page.currentIndex)`, for every page
including the visible one. Consequences, all of them good:

- **A swap needs no GPU readback.** Departing page: park `currentIndex`; its
  raster is already the entry `setUndoPoint` wrote. Arriving page: upload its
  current entry. One `texImage2D`, no `readPixels`.
- **`Delete this Page` is `history.clear()` on the current page**, followed by
  a swap to the other — the manual's behaviour exactly — and the memory
  genuinely goes.
- **An unused page costs one blank entry**, which is what "a spare page uses up
  memory even if there is nothing on it" means here — honestly, and about 60 KB
  at Lo-Res rather than DPaint's unconditional 40 KB of Chip RAM.
- **No new serialization shape.** The persistence record already knows how to
  write an `UndoEntry`-shaped raster.

The invariant this rests on — _the current entry equals the canvas_ — is true
between strokes and false during one, which is fine, since a swap is a discrete
command. It is also false on the one path that mutates pixels without recording
an entry: `applyScreenFormat`'s conform, which deliberately returns "an entry is
owed" and lets its caller record it. **The swap therefore falls back to
`getCanvasColorIndex()` when there is no current entry**, rather than assuming.

## The swap

No new pipeline. The existing one, in order:

Positional throughout: park the page you are leaving, load the one you are
going to. Neither is "the spare".

```ts
export const swapPage = (context: Context): void => {
  pages.park(context.state); // the page being left
  const next = pages.advance(); // (i + 1) % pages.length, allocating lazily
  const entry = next.history.getItem(next.currentIndex);
  setPendingCanvasContent(toCanvasColorIndex(entry), { recordUndoPoint: false });
  context.actions.palette.setBackgroundColor(next.backgroundColorId);
  context.state.undo.currentIndex = next.currentIndex;
  context.actions.canvas.setResolution({ ...next.size, recordUndoPoint: false });
};
```

`pages.park` reads what the current page owns (resolution, background color,
`undo.currentIndex`, scroll focus) out of Overmind and into `pages[i]`; that
list is the one in "Per page or per document" below.

Everything here already exists and is already exercised: `setPendingCanvasContent`

- `setResolution(recordUndoPoint: false)` is precisely the path a cross-size
  undo takes (`useUndo` in `components/canvas/hooks.tsx`), and
  `useCanvasContentUpload` does the upload after React commits the element resize.

Three details the DPaint source hands us for free:

- **Kill color cycling across the swap** (`KillCCyc()`). `CycleDriver` animates
  the palette; leaving it running through a resolution change means it repaints
  during the window where the canvas has one page's size and the other's
  pixels. Stop and restart, or just let the next frame re-read state — but
  decide it deliberately.
- **`newSpare`.** The first swap onto a never-used spare must _not_ change the
  background color; the fresh page inherits yours. After that the background
  swaps with the page. One boolean, exactly as in `SPARE.C`.
- **Zoom mode closes** if the sizes differ — `setResolution` already does this,
  and it is the right behaviour here too.

Cost, extrapolating from the benches in `docs/local/undo-memory.md` part 3 (upload only,
no readback): a few ms at every Amiga format, ~40 ms at 3000×2000. The latter
is one-off per swap and comparable to that canvas's per-stroke commit cost,
which is already accepted.

## Per page or per document

The manual settles most of this by decree; our state model mostly already
splits along the same line.

|                                                  | Where it lives today          | Page or document                             |
| ------------------------------------------------ | ----------------------------- | -------------------------------------------- |
| raster                                           | GL texture / `undoBuffer`     | **page**                                     |
| `canvas.resolution` (page size)                  | `canvas` state                | **page**                                     |
| `palette.backgroundColorId`                      | `palette` state               | **page** (manual, explicit)                  |
| undo history                                     | `undoBuffer` singleton        | **page**                                     |
| scroll focus                                     | `canvas` state                | **page**                                     |
| palette + ranges                                 | `palette` state               | document (manual: shared, by decree)         |
| `screenFormatId`, `videoStandard`, `pixelAspect` | `canvas` state                | document                                     |
| `trueColorEnabled`                               | `canvas` state                | document                                     |
| `hasTrueColorPixels`                             | `canvas` state                | **page** (derived from its entry)            |
| document name, modified flag, save format        | `app` state                   | document                                     |
| tool, brush, modes, symmetry, fill style         | `toolbox`/`brush`/…           | document ("the toolbox sits above the page") |
| `scaleMode`, UI scale                            | `canvas` state / `uiScale.ts` | neither — view/device                        |

Where the references disagree, and what I'd follow:

|                      | DPaint I                | DP2 manual               | PyDPainter               | proposed |
| -------------------- | ----------------------- | ------------------------ | ------------------------ | -------- |
| page size            | shared (screen size)    | **per page**             | shared                   | per page |
| background color     | **per page**            | **per page**             | shared                   | per page |
| undo history         | one slot, saved on swap | —                        | one, **cleared on swap** | per page |
| file name / modified | shared                  | shared (spare not saved) | **per page**             | shared   |
| palette              | shared                  | shared                   | shared                   | shared   |

The one I'm least sure of is the last row: PyDPainter gives each page its own
`filename`/`filepath`/`modified_count`, so a page is a document you can load
and save independently. That is a bigger feature than the manual's spare, and
in a browser app with no file manager it is arguably the more useful one — but
it is also the multi-document idea from the tabs discussion arriving through a
side door, and it would put a second unsaved document behind a keystroke with
no window of its own. Keep one name for the document and none per page for
now; revisit if a page starts feeling like a document rather than a scratch
surface. Note this is the one place where "no main page" bites: with a single
document name and a symmetric pair, `Save` writes whichever page you happen to
be looking at.

The awkward one is `backgroundColorId`, because it lives in the `palette`
module while being page state. Don't move it — park and restore it in the swap
action, the way the rest of the page's fields are parked. It is one field, and
moving it would touch matte-brush rendering, the palette UI and the fill code
for no gain.

## Undo

**Per page**, and this is forced rather than chosen: `Copy to Spare` destroys
whatever was on the spare and must be undoable there, and undoing on one page
must not silently repaint the other.

The budget stays **global**. Two separate 256 MB budgets would be a lie about
the machine, and two separate 100-entry caps would hand you half a history each
while you paint on one page and never touch the other.

Concretely, in `UndoBuffer.ts`:

- `UndoBuffer` becomes instantiable (it already is a class; only the
  `export const undoBuffer = new UndoBuffer()` singleton line changes).
- A tiny module-level accountant owns `totalBytes` across all live buffers and
  a monotonic `seq` stamped on each entry.
- Eviction, when `push` exceeds the budget: drop the **globally oldest** entry —
  compare the two buffers' front entries by `seq` — while honouring
  `MIN_UNDO_LEVELS` per buffer. Both buffers reaching the floor is the
  load-path's problem, as it already is (part 3a).
- `undoLevelsForCanvas(w, h)` gains a second page's bytes when a spare exists,
  which is what `docs/local/undo-memory.md` part 5 meant by "the load-size cap must check
  `MIN_UNDO_LEVELS × (pageA + pageB)`". Not a clean 2×: the pages can be
  different sizes.

**The swap is not an undo point.** DPaint I's `UndoSave()` before the swap
exists because it had one undo slot for the whole program; with per-page
histories, recording the departing page's pixels into its own history at the
moment it stops being visible would append an entry identical to the one
already there. Worse, the DPaint I behaviour is actively confusing on a modern
undo stack — press undo after a swap and the _other_ page's old pixels appear
on this one. Skip it.

`Copy to Spare` and `Merge` both push one entry into the destination page's
history. For `Copy to Spare` that destination is the page you are not looking
at, which is exactly why its history has to be reachable while parked.

## The one real new invariant

This is the part that genuinely complicates the architecture, and it is worth
naming so it does not arrive as a surprise: **the palette is shared, so every
operation that rewrites all pixels against a palette must run over both pages.**

Today those operations read `paintingCanvasController.getCanvasColorIndex()`,
transform, and write back. With a spare, each must also transform the spare's
current entry. The good news is that the transforms are already pure methods on
`CanvasColorIndex`, so the spare — inert CPU data — is the _easy_ case:

| Operation                         | Site                                      | What the spare needs            |
| --------------------------------- | ----------------------------------------- | ------------------------------- |
| palette depth reduction / rebuild | `applyScreenFormat` (`canvas/actions.ts`) | `conformedTo(...)` on its entry |
| True Color off (flatten)          | same                                      | same call, `flatten` set        |
| image load rebuilding the palette | `app/actions.ts` → `applyScreenFormat`    | same                            |
| palette edits (single colors)     | `paletteEditor`                           | nothing — indices unchanged     |
| color cycling                     | `CycleDriver`                             | nothing — palette texture only  |

Contain it in one place: a `pages.conformAll(fn)` that applies the same
transform to every parked page's current entry and rewrites it in place. Do **not** let individual call sites reach into the spare's
history.

PyDPainter is the cautionary example here, because it did the opposite and the
result is visible: `for i in range(len(self.proj))` appears at four separate
sites in `config.py` — palette set (1025), page resize (1580), new-image sizing
(424), stencil clear (461) — each with its own subtly different handling of
"the current one" (`if i == self.proj_index: continue`, except at 1582 where it
assigns instead). Four chances to forget the fifth site. One function that
takes a transform has no such surface.

Two things follow that should be written down before anyone is surprised by
them:

- A conform rewrites the spare's _current entry only_, not its whole history.
  Its older entries keep their own palettes — which is exactly what `UndoEntry`
  already carries and `restoreEntryState` already restores, so undoing past a
  palette change on the spare still works. This is the behaviour
  `docs/local/undo-memory.md` part 2 flags as "one place we're deliberately better than
  PyDPainter"; the spare must not regress it.
- Loading an image replaces the current page and resets _its_ history. The
  spare survives, and its pixels now index into the new picture's palette. That
  is DPaint's behaviour and the manual's shared-palette decree taken to its
  conclusion; it looks like corruption if you did not expect it. Either accept
  it (my recommendation — it is the documented model) or conform the spare to
  the new palette on load, which is one extra call to the same function.

  PyDPainter goes further and is worse for it: on a load, a page whose size
  does not match the new image is **silently replaced with a blank surface**
  (config.py:424–434, the `else` branch allocating a fresh `pygame.Surface`).
  Load a differently-sized picture and whatever was on your spare is gone, with
  no undo, since the swap cleared that too. Our per-page history means the
  worst we can do is leave the spare's pixels indexing a new palette — but the
  load path is the place to check that we don't accidentally reproduce this.

## Merge in Front / Merge in Back

Cheap once the spare is CPU-side data, and it is the operation that makes the
spare feel like DPaint rather than like a clipboard.

One new `CanvasColorIndex` method, in the same family as `copiedInto`:

```ts
// Composites `other` over this, treating the source's background color as
// transparent — the mask MakeMask/MaskBlit builds in SPARE.C. Anchored
// top-left, cropped to this page's size, like placedInto.
mergedWith(other: CanvasColorIndex, transparentColorNumber: number): CanvasColorIndex
```

_Front_ merges the spare over the current page, keying on the **spare's**
background color; _back_ merges the current page over the spare, keying on the
**current page's** background color, and the result replaces the current page.
That asymmetry is exactly `MakeMrgMask`'s `NEGATIVE`/`POSITIVE` branch, and it
is the reason per-page background colors matter enough for the manual to call
them out.

Applied straight to the controller, then one `setUndoPoint` — _not_ through
`setPendingCanvasContent`, which only uploads when a resolution change
re-renders the canvas element, and a merge does not change the page size. Sizes
may differ between the pages; top-left anchor, crop the overflow, same as every
other size-mismatched copy in the app. Merge In Back composes it as
`spare.placedInto(this page's size, this page's background).mergedWith(this
page, same background)`, so wherever the spare does not reach still shows what
was already here.

## Persistence

The manual says the spare is not saved to disk, and that stays true for file
export — `Save` writes the current page. The browser autosave is a different
promise ("reopen where I left off"), and `docs/local/undo-memory.md` part 5 already
concluded **both pages must persist**, because restoring only the current one
means a post-reload swap silently reveals an empty spare.

Shape:

- **A second IDB key**, `offpage:<tabId>`, beside `doc:<tabId>` — named for the
  storage role (the page not being painted), not for a page identity, since
  there isn't one. `doc:` keeps holding the visible page's raster, so its
  existing shape and its every-400-ms write path are unchanged; it gains one
  field, `currentPageIndex`. Not a field holding a second raster inside
  `DocumentRecord`: that would double every autosave write for data that
  changes only on a swap or a copy.
- The off-page record is the same shape minus the document-level fields:
  `{ version, width, height, pixels, packed, backgroundColorId, savedAt }`. The
  palette, screen format and name live in the document record, which is the
  split `docs/local/undo-memory.md` part 5 predicted.
- **Written only when the off-page one changes** — a swap (which rewrites both
  keys once, as the two pages exchange storage roles), a copy, a merge, a
  delete. Track a `pagesChangedAt` timestamp in state and let the existing
  throttled writer watch it alongside `lastUndoPointTime`.
- **Pruned together.** `prune()` in `documentAutosave.ts` currently sweeps
  `doc:` and `guard:` prefixes; a spare key must die with the doc key sharing
  its tab id, or it becomes an orphan holding tens of megabytes. Same trap the
  guard keys already had, so extend the same code path rather than adding a
  second sweep.
- **Guarded by the same marker.** The spare is applied inside the same restore
  attempt, so a poisoned spare record is dropped by the existing "attempting
  restore" logic.
- **Loaded eagerly, applied lazily.** Read it as part of `loadDocument`, but
  the raster only becomes an `UndoEntry` in the spare's buffer — nothing
  touches GL until the first swap. That is free, and it avoids an async path
  inside the swap action.
- Version: the spare key is new, so no migration. Bump `VERSION` only if
  `DocumentRecord` itself changes, which it need not.

## UI

- **`j` swaps**, from the manual, and the key is unclaimed
  (`GlobalHotkeyManager.tsx`, `docs/keyboard.md`). It is the only DPaint spare
  binding.
- **Picture drawer gadgets**: `Spare Page`, `Copy to Spare`, `Merge in Front`,
  `Merge in Back`, `Delete This Page`. That is DPaint's own Pict-menu grouping
  (`MENU.C` cases 0–3 plus DP2's delete), and the Picture drawer is already
  where whole-canvas operations live. Icons want a pass against
  `docs/style-guide.md` — five new gadgets is the single largest UI cost here.
- **Which page am I on?** DPaint never said — on an Amiga you had one screen
  and knew, and in any case its bitmaps swapped, so it could not have named the
  page even in principle. Two identical-looking pages behind a one-key swap is
  a real confusion risk in a browser window that also has tabs, and this is
  where our stable indices pay off: `PAGE 1` / `PAGE 2` in `ScreenStatus`,
  which already carries session/format facts. Ours, not DPaint's, and worth it
  — the alternative label, `SPARE`, would be a lie half the time, since the
  page you are looking at is never the spare one.
- **`Delete This Page` confirms**, per the manual. The existing dialog
  machinery covers it.

## Could a second tab be the spare?

Short answer: it can be made to work, it costs more than the in-process
version, and it delivers something else. Long answer, because the idea is
reasonable and the reasons it fails are specific.

**What already exists.** Per-tab autosave means each tab is _already_ an
independent document with its own picture, history and backup — that was
settled deliberately (`docs/local/undo-memory.md` part 4, "Two tabs": adopting another
tab's record "read as the tabs being synced" and was removed the same day). So
the zero-integration version of "use a second tab as a spare" works right now:
open a tab, paint, alt-tab. What is missing is only the _sharing_, and the
sharing is the entire cost.

**What integration would take.** `BroadcastChannel` carries structured-clonable
data between same-origin tabs, so mechanically each piece is possible:

| Spare feature                     | Cross-tab implementation                                                     |
| --------------------------------- | ---------------------------------------------------------------------------- |
| swap (`j`)                        | not possible — see below                                                     |
| Copy to Spare                     | post the packed raster (a few MB)                                            |
| pick up a brush there, paint here | post the `BrushColorIndex` — small, and this is the _primary_ documented use |
| shared palette                    | two-way sync, no owner                                                       |
| Merge in Front/Back               | post the raster, composite locally                                           |
| per-page background color         | free, already separate                                                       |

**Why it loses.**

- **Memory goes the wrong way.** The whole framing of `undo-memory.md` is that
  rasters are the expensive thing. Design A adds one packed raster plus a
  bounded history sharing the existing global budget. A second tab adds a
  second React tree, two more WebGL contexts, a second undo buffer with its
  _own_ 256 MB budget the first tab cannot see, and a second copy of every
  texture and brush. On the 12 MP case that part 3a measured at ~1 GB RSS, this
  is not a rounding error.
- **The swap cannot exist.** `j` swapping "to the other page" instantly is the
  feature. A page cannot focus a sibling tab; only an opener/popup pair can
  focus each other, which turns the spare into a popup window — blockable,
  losable behind the main window, and gone if the user closes the wrong one,
  taking a page of the document with it. What you get instead is Cmd-`, which
  is not a swap, it is window management.
- **Shared state becomes distributed state.** "The palette follows you to the
  second page" is a decree in a single-process program and a synchronisation
  problem across tabs: two tabs can edit the palette at once, there is no
  owner, and the reconciliation has no correct answer. Same for screen format
  and True Color, both document-level. The one genuinely new invariant above
  ("every whole-canvas palette op must touch both pages") becomes an
  asynchronous, best-effort, partially-failing operation instead of a function
  call.
- **It reintroduces the model that was already rejected.** The tabs-look-synced
  surprise that killed record adoption comes straight back, now permanently and
  by design.
- **Undo spans processes.** A merge that pulls the other tab's pixels is one
  undo entry here and nothing there — until the other tab paints over the
  material you merged, at which point the two histories disagree about a
  picture they jointly produced.
- **The failure modes are the browser's, not ours.** Tab discard under memory
  pressure, a background tab throttled so it does not answer, a closed tab
  taking half the document with it. `documentAutosave.ts` already carries the
  scar tissue from one round of cross-tab coordination (the localStorage
  heartbeat registry that silently lost records every reload); a second round
  buys a feature that design A gets for free.

**What the two-tab idea is actually good for**, and worth keeping separate:
_multi-document_ — two unrelated pictures open at once, which the spare page
explicitly is not. That already works, needs nothing, and should stay
uncoordinated exactly as it is. If it is ever formalised, the interesting
addition is one-way brush hand-off (post a `BrushColorIndex` over
`BroadcastChannel`, no shared state, no reconciliation, no undo implications) —
which happens to cover the spare page's primary documented use case, at maybe a
day's work and none of the coupling. That is a genuinely attractive small
feature, and it is a reason to consider the spare page _less_ urgent, not a
reason to build the spare page out of tabs.

## Phases

1. ~~**Swap only.**~~ **Done.** The `pages` store, per-page undo buffers with
   the shared accountant, `pages.swap`, `j`, the Picture-drawer gadget, the
   `ScreenStatus` readout. Nothing persists yet.
2. ~~**The conform invariant.**~~ **Done.** `conformParkedPages` in
   `PageStore`, called from `applyScreenFormat` for a depth reduction, a
   rebuilt palette or True Color going off.
3. ~~**Copy to Spare, Delete This Page.**~~ **Done.** `J` and a gadget for the
   copy, a confirming requester for the delete (disabled at one page). The copy
   pushes onto the _destination's_ history, so undoing there steps back past
   it — the requirement that made per-page histories non-optional in the first
   place, now exercised. The delete releases its history's share of the byte
   budget: verified 0.63 MB to 0.39 MB across it.
4. ~~**Merge in Front / Back.**~~ **Done.** `CanvasColorIndex.mergedWith` plus
   two more gadgets on the Spare strip, both disabled with a single page. Verified
   on a pixel both pages had painted: front gives it to the spare, back keeps
   it for the page on screen, one undo entry restores the whole merge, and the
   other page is untouched either way.
5. ~~**Persistence.**~~ **Done.** `offpage:<tabId>` beside `doc:<tabId>`, read
   inside the same guarded restore attempt and pruned with the document it
   belongs to. Both pages come back, on the page that was showing.

Phases 1–3 are the coherent shippable unit. Phase 5 is the one that touches
code with known sharp edges (`documentAutosave.ts`), so it should not ride
along with the rest.

## What building it turned up

- **Anything that changes _which_ histories exist has to resync the readout.**
  Twice now: the swap moves `undo.currentIndex` to another history, and
  dropping a page removes one from the shared total. Neither writes to a
  buffer, so neither went through the one place that maintained the mirrors.
  The symptom both times was a Preferences memory figure describing a state
  that no longer existed.
- **The swap has to resync the buffer readout.** It moves `undo.currentIndex`
  to another history without writing to either, so `bufferEntryCount` and
  `bufferBytes` went on describing the page just left and the Preferences
  memory readout lied. `syncBufferSize` is exported for it — the only case in
  the app where the readout's _subject_ changes rather than its contents.
- **The parked-page conform is not gated on `retainPicture`,** where the
  current page's is. That flag means "the caller is about to replace this
  canvas with a blank one, so remapping it first is wasted work", which says
  nothing about the pages nobody is replacing. Gating both together would have
  left the spare indexing the old palette exactly when a format change
  discards the current picture.
- **`replaceItem`, not `push`.** Conforming a page keeps its pixels meaning
  what they already meant, so it rewrites that page's current entry rather than
  appending a step to undo. Older entries keep the palettes they were taken
  under, which is what `restoreEntryState` relies on and what `undo-memory.md`
  part 2 calls the place we are deliberately better than PyDPainter.
- **Verified by disabling it.** With the conform switched off, a page painted
  before a reduction to 4 colors comes back with its pixels _gone_: the index
  falls outside the new palette and renders as background. With it, both pages
  land on the same nearest surviving color. Worth keeping as the shape of the
  regression to look for.

### "Keep the picture?" decides both pages

**Decided 2026-08-13.** The Screen Format requester already asks whether the
picture survives the change, and the pages are part of the picture, so that one
answer governs both:

|             | current page                 | the others  |
| ----------- | ---------------------------- | ----------- |
| Keep        | conformed to the new palette | conformed   |
| Start fresh | blank canvas at the new size | **dropped** |

This started as a question about whether a format change should carry pages
over at all, and the honest answer is that **no DPaint precedent exists**:
DPaint I had no in-session format change (its `FreeSpare` runs only from
`CloseDisplay`, which `main` calls at exit), and DPaint II refuses the
operation outright — _"You cannot change the resolution of your picture while
it is on the screen."_ PyDPainter, the only implementation that allows it,
keeps every page and repalettes them all.

So it is our call, and tying it to `retainPicture` beats both absolutes. Always
dropping would destroy work the user cannot see, unwarned, for a change as
mild as 32 colors to 16 — which conform handles perfectly. Never dropping left
a real incoherence: "start fresh" would blank the current page and leave a page
of the old picture's material behind the `j` key. The requester's answer is
already the user's statement of intent, given while they are present and
looking at the question.

`dropParkedPages` is the primitive, and `newPicture` (right-click CLR) uses it
too, which is the decision from the same conversation. Neither is undoable: a
page's history _is_ the page, so once it is released there is nothing left to
step back into.

**Releasing a history has to take it off the shared budget** (`releaseBudget`),
or its bytes go on counting against what the surviving pages may keep, forever.
Verified by creating and dropping a second page four times over: 2.48 MB with
two pages, 0.83 MB after each drop, with no drift.

### A rebuilt palette is built from every page

The nastiest bug of the lot, and invisible until someone asked what a reduction
does with two true-color pages. `applyScreenFormat`'s "build the palette from
the image" branch read `paintingCanvasController.getCanvasColorIndex()` — the
page on screen, the only one with a texture — and then conformed _every_ page
to the result.

Measured before the fix. Page 1 painted in two blues, page 2 in two reds, True
Color off, reduce to 8, palette source "image":

```
rebuilt palette: 0,0,0 | 10,20,200 | 30,60,240 | 0,0,0 | 0,0,0 | 0,0,0 | 0,0,0 | 0,0,0
page 1 inks:     10,20,200, 30,60,240      (exact — its own colors are in there)
page 2 inks:     []                        (every red flattened to black)
```

Page 2's artwork was destroyed, and the insult is the five black padding slots:
the palette had room to hold those reds exactly and never looked for them.

The fix is what the shared-palette decree implies — a palette every page
indexes into is built from every page's pixels. `parkedPageRasters()` supplies
the off-screen rasters, their RGBA is concatenated with the visible page's, and
the exact/median-cut choice runs over the union. Same case afterwards:

```
rebuilt palette: 0,0,0 | 10,20,200 | 30,60,240 | 220,15,10 | 250,60,30 | 0,0,0 | 0,0,0 | 0,0,0
page 1 inks:     10,20,200, 30,60,240      page 2 inks: 220,15,10, 250,60,30
```

Both lossless, because 4 distinct colors fit in 8 slots. The median cut was
checked separately (16 distinct colors across two pages, reduced to 4): it now
spends slots on both hue families where it previously spent all of them on the
visible page's.

**The tension worth naming:** a palette serving two pages is a worse palette for
each than one serving only the page you are looking at. With 64 colors and two
photographs, each effectively gets half. That is the honest cost of one shared
palette, and it is preferable to the alternative, which is not "the visible page
looks better" but "the other page is silently destroyed". Someone who wants the
whole palette for one picture has the answer already: discard the other page,
which the requester now offers.

Cost: one extra full-canvas `resolveToRGBA` per parked page, plus a concat, on
a path that already resolves the visible canvas. `combinedRGBA` returns the
single buffer untouched when there is only one page, so the ordinary case pays
nothing.

### Only the page you are on gets resized

Page sizes are per page, so a screen format change resizes the page on screen
and leaves the others alone. The Resize/Crop/Keep question the requester asks
is about pixels that would be cropped away — which only arises for a page whose
size is actually changing, so there is nothing to ask the others and no answer
that would apply to them anyway. A page left larger than the new screen just
scrolls within it, which is what `canvas.resolution` and `screenFormatId` being
separate fields has always meant (DP2 manual: _"if you are working on a page
size larger than the screen, you can scroll to the off-screen portions"_).

This needed no code — it falls out of the resize actions operating on the
current canvas — but it did need checking, because every swap tested up to that
point had been between pages of the same size. Verified 2026-08-14:

|                                      | page 1                                      | page 2                   |
| ------------------------------------ | ------------------------------------------- | ------------------------ |
| set up                               | 400x300, 3 px, 6 entries                    | 250x500, 2 px, 4 entries |
| swap, back, swap                     | each keeps its own size, pixels and history |                          |
| format change to Lo-Res, from page 1 | 320x256, 3 px                               | 250x500, 2 px, untouched |

So the cross-size swap path — `setPendingCanvasContent` plus a `setResolution`
to a _different_ size, which is what `useUndo` does for a snapshot from before
a resize — works for a swap too, GL drawing buffer included.

Fitting the spare to the new screen stays a deliberate act on the page you can
see: swap to it, then Canvas Size or Crop. Same principle the crop box was
built on — which part to keep is a question you answer by looking, and no
answer given on behalf of a page that is not on screen can be that.

### The one asymmetry this leaves

An undo that crosses a palette change restores the page on screen **exactly**
and the others **approximately**. Measured, painting one pixel on each page,
reducing 32 colors to 4, then undoing:

|              | on screen             | off screen                          |
| ------------ | --------------------- | ----------------------------------- |
| painted      | `255,204,153`         | `255,204,153`                       |
| reduced to 4 | `238,204,153`         | `238,204,153`                       |
| after undo   | `255,204,153` — exact | `238,204,153` — valid, not original |

The page on screen comes back from its own snapshot, which still holds the
pre-reduction pixels. The off-screen page has no snapshot of that moment: a
conform _replaces_ its current entry, so the original indices are gone and the
best an undo can do is map what is there into the restored palette. The pixel
stays a legal color throughout, which is the invariant; it does not travel back.

Making it exact would mean pushing an entry into a parked page's history on
every conform, and then moving _that_ page's cursor when the other page's undo
moves — two cursors travelling on one keystroke, and history steps in a page
the user never touched. Not worth it for a round trip through a lossy
operation, but it is the reason this is written down rather than assumed.

### What persistence turned up

- **A swap has to count as a change to the document record.** It changes the
  visible picture without appending an undo entry, so the write trigger, which
  watched only the undo timestamps, ignored it: a reload came back showing the
  page that had been swapped away from. `pages.lastChangeTime` joins the two
  undo stamps in what the writer watches.
- **`worthSaving` was reading the document off one page.** It asks whether
  there is anything worth writing, and answered from the current page's history
  length — so swapping to a page holding a single entry stopped the writer
  entirely, freezing the record on the other page. A second page is now reason
  enough on its own. This is the same class of mistake as the two stale-mirror
  bugs earlier: a question about the document answered from the page in front.
- **The separate key does what it was for.** Measured over two painting bursts
  with a swap between: painting rewrites the document record only, a swap
  rewrites both once as the pages trade storage roles, and painting afterwards
  goes back to the document alone. Deleting a page removes its record.

### The last of the True Color asymmetries

`applyScreenFormat` asked two questions off the visible page that are really
about the document, and the second only became reachable once the first was
fixed:

- **Whether anything needs conforming.** It read `flatten`, which is "does _this
  page_ hold true-color pixels". A document whose true-color pixels were all on
  the page behind therefore took neither the palette rebuild nor the conform
  when True Color was switched off with no depth change. Now it asks
  `depthShrunk || trueColorTurnedOff`, both document-level.
- **Whether the visible page conforms.** Fixing the first means a rebuild can
  now be triggered by pixels on another page — and a rebuilt palette moves every
  color _this_ page indexes too. So its conform is `conforming && (depthShrunk
|| flatten || rebuilt !== null)`, where before the last term could not arise.

Measured, with an indexed visible page and a true-color green (17,200,90) on the
page behind, True Color off at the same 32 colors: the palette is rebuilt and
holds that green exactly, so both pages come through lossless. With the old gate
the green flattened to 0,187,85 — the nearest colour in the palette that was
already there.

## Open questions

- ~~**Undo across a palette change, with a second page holding pixels.**~~
  **Decided and done: the other page comes along.** A palette belongs to the
  document, so a change to it from _any_ source is the same kind of event —
  `restoreEntryState` is as much a palette op as `applyScreenFormat` is, and
  the rule is the invariant's, not a special case. It conforms the parked pages
  with `remapAll` (the whole palette was replaced, so every indexed pixel
  resolves to the color it was showing and takes the nearest new one) and
  nothing flattened, since an undo is not the True Color switch. Only reached
  when the palettes actually differ, so an ordinary undo step costs nothing.

- ~~**Does the zoom view follow the swap?**~~ **Decided: no — a swap always
  closes it.** `setResolution` already does this when the size changes; the
  swap closes it unconditionally, because a zoom parked on the same coordinate
  of a different picture is worse than being asked to reopen it. One line in
  `swapPage`, and it makes the two size cases behave alike.
- ~~**`CLR` on the spare.**~~ **Decided, and it costs almost nothing:**
  left-click `CLR` needs no change at all. `app.clearPage` is
  `paintingCanvasController.clear()` plus an undo point, so it is already
  page-scoped by construction — only the current page is live. Right-click
  (`app.newPicture`) additionally **deletes the other page(s)**: a fresh
  document is a fresh document, and leaving a stale page behind the `j` key
  after one is the kind of thing found weeks later.

  Two notes for whoever implements it. The discarded page is **not
  recoverable**, while the rest of `newPicture` is undoable (it queues its
  content with `keepHistory: true`) — that asymmetry is defensible but should
  be deliberate, and it is an argument for the confirm-on-delete the manual
  gives `Delete this Page`. And DPaint I is no precedent either way: `FreeSpare`
  is reached only from `CloseDisplay`, which `main` calls at program exit
  (PRISM.C:278), so the spare outlives everything except quitting.

- **Brush slots** (`docs/brush-slots.md`) are document-level under the rules
  above — the toolbox sits above the page. Worth confirming that reads
  correctly once you can actually carry a brush between pages, since that is
  the whole point of the feature.
- **Should the spare have its own document name?** No, per the manual (the
  spare is not saved), but `Save` writing only the visible page while the
  spare holds work is a data-loss shape worth at least a hint in the tab-title
  marker.
