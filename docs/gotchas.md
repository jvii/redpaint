# Gotchas

Things that cost hours to find and are invisible in the code. The code carries a
one-line note and a pointer here; the detail lives here so it is out of the way
of reading the code, and the history of how each was found is in `git log`.

## The pane is not the area when the zoom view is open

The drawing pane is `flex-grow: 1` beside the zoom view's sized basis, so with
the zoom view open it is only part of the area it sits in. Anything sizing a
canvas "to the window" wants the area, not the pane: closing the zoom view hands
the rest straight back, and resizing the canvas is itself what closes it
(`setResolution`), so a canvas fitted to the pane is half a window wide by the
time it exists. That is `canvas.paneAreaSize`, tracked beside `viewportSize`,
and what `nativeCanvasSize` answers with — right-clicking CLR with the zoom view
open used to produce a half-width picture.

## Fitting the canvas to its pane

`MainCanvas.paneSize` measures the drawing pane so a canvas can be sized to fill
it. Three separate ways to get this wrong, all of which end in scrollbars:

**`offsetWidth` is an integer.** A pane 1417.6 CSS pixels wide reports 1418, so a
canvas built to that is wider than the pane it lives in. Measure
`getBoundingClientRect()` and **floor** the result: the canvas can then fall up
to a physical pixel short and never a pixel over. Note a fractional device pixel
ratio is enough on its own — at dpr 1.5, `round(1419 × 1.5)` overflows an
*integral* pane width by a third of a pixel.

**Do not subtract a scrollbar that happens to be showing.** It reads as the more
careful measurement and is worse: the gutter is only there while a scrollbar is
up, so a measurement taken during a transient gets recorded and the *next* fit
comes out 15px short. The border box is what the pane has for content whenever
it is not scrolling, which is the state a fit is aiming at.

**Scrollbars latch.** These are 15px space-taking scrollbars
(`.retro-scrollbar`), so once one is up, a canvas sized to the pane is exactly a
gutter too wide for what is left — and the browser never revisits the decision,
because undoing it needs the canvas to fit and the canvas only fits if it is
undone. Changing screen format is what starts it: the resolution and the display
scale arrive in separate updates, so for a frame the canvas can be the new size
at the old magnification (Lo-Res to Native is the bad one — a 320×256 page
becoming 2010 wide while still drawn at Lo-Res scale).

The escape is to make the pane decide again: set `overflow: hidden`, force a
layout, restore. With no scrollbars in the way the decision is taken from
scratch, and a canvas that fits keeps them off. Run it twice — next frame and
again a little later — because the frame after the change can still be
mid-change. Restore `scrollLeft`/`scrollTop` around it.

Seen in Safari; equally reachable in Chrome, which escapes by luck of ordering.

## Autosave

**One record per tab, and a tab only ever restores its own.** Adopting the
newest record instead reads as the tabs being synced: open a second tab and it
shows the first tab's picture, clear one and the other comes back empty.
Reaching another tab's backup is a deliberate act and belongs to a requester
that is asked for.

**The crash guard is per tab too.** A marker goes down before a record is
applied and comes up once it is safely applied, so a start that finds *its own*
marker knows the last attempt did not survive and drops that record rather than
reopening the same trap. A shared key cannot tell our own dead attempt from
another tab's live one — the version that tried needed a timestamp, a staleness
window, and reasoning about which case a marker described, and getting it wrong
once had one tab delete another's picture.

**Prune on the read path, never the write path.** Deciding what is old means
reading `savedAt`, which deserialises the whole record, raster included. Pruning
after each write therefore read tens of megabytes of neighbouring records on
every autosave and threw them away. Records only accumulate when tabs come and
go, so startup is exactly as often as it needs to run.

**Prune records and markers separately.** A marker has no `savedAt`, so treating
one as a record dates it as ancient and sweeps it immediately — including the
one written moments earlier by the restore running alongside, quietly disabling
the crash detection it exists for.

## Tab identity

Each tab owns its own autosave record, keyed by an id in `sessionStorage`. The
difficulty is that sessionStorage is *copied*: Duplicate Tab, `window.open` and
opening a link all hand the new tab an id another tab may already be painting
under. A Web Lock named for the id settles it — held for the life of the
document, released by the browser when it is destroyed, so `ifAvailable`
answers "is a live document using this id" immediately, with no protocol and
nothing to clean up.

Two earlier attempts tried to *infer* that answer, and both are worth knowing
about because both look reasonable:

- **A heartbeat registry in localStorage**, read-modify-written by every tab. A
  tab releasing its claim on reload had it written straight back by another
  tab's heartbeat mid-flight, so it came back, believed itself a duplicate, and
  lost its own record on every reload.
- **A BroadcastChannel question with a 250ms reply window.** The document being
  replaced was still alive to answer, so a reloading tab reported itself as its
  own duplicate. Closing the responder on `pagehide` helped, and a
  navigation-type check — only a fresh navigation can be a copy — avoided asking
  on reload. But Duplicate Tab restores the session history, so its navigation
  type is `reload`: the copy skipped the check and adopted the original's
  record. The heuristic was wrong in precisely the case it existed to catch.

A lock has no window in which to be wrong.

## Overmind

**Deriveds are not reliable inside actions.** They can still hold the value from
before the action's own mutations, which is invisible whenever the stale value
happens to match — and ruinous when it does not. `applyScreenFormat` read
`paletteArray` back after replacing the palette and remapped a picture against
the *old* one; `setUndoPoint` recorded the old palette into an entry, which only
showed on redo. Read the raw state a derived is computed from
(`Object.values(state.palette.palette)`), or the value just installed. Where a
derivation is genuinely wanted, export a plain function over raw state — see
`foregroundPaintColorOf` in `overmind/palette/state.ts`.

There is a test that enforces this: `test/overmind/derivedsInActions.test.ts`
reads the deriveds out of each module's state and fails if any `actions.ts`
mentions one.

## Safari

**A `<legend>` does not size its group.** It is laid out specially rather than
as an ordinary child, so a fieldset's intrinsic width does not reliably include
it. `min-width: max-content` on a group whose heading is a `<legend>` is asking
for something the engine does not owe you — Chrome grants it, Safari does not,
and re-measures when anything inside changes. Use `RetroFieldset as="div"`,
which renders the legend as a `<span>`; nothing in this app needs native
fieldset disabling, since every control takes an explicit `disabled` prop.

## CSS zoom (UI Size)

The chrome is scaled with CSS `zoom` (`uiScale.ts`), which multiplies computed
lengths. Two consequences that are easy to get backwards:

- **Viewport units inside a zoomed box** must divide by `--ui-scale` to keep
  meaning real screen pixels. Percentages must not — the containing block is
  already converted into the zoomed box's units.
- **A length measured with `getBoundingClientRect` and then applied** to an
  element inside the zoom gets multiplied again, so it has to be divided by the
  scale first. The toolbox hint panels landed at `scale ×` their intended offset
  until they did. `currentUiScale()` exists for this.
- **The canvas sits at a fractional offset**, because the zoomed chrome above it
  does not come out to a whole number of pixels: `rect.top` is 33.5 at 100% and
  37.5 at 75%. Anything flooring `clientY - rect.top` therefore has a half pixel
  at each edge that comes out at -1, which is what put -1 in the coordinate
  readout (`canvasPixelUnder` clamps it). Whole-pixel canvas geometry is not a
  safe assumption at any UI scale, including 100%.
