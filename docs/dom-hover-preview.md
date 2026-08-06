# DOM hover preview — design

Status: designed and implemented 2026-08-06 in the same live bisection
session on the affected Windows machine; hover verified smooth there for
both brush kinds (the PixelBrush default and CustomBrush bitmaps). Fixes the
hovering pointer/brush preview visibly trailing the mouse on Windows — in
Chrome, Edge *and* Firefox — by taking the overlay canvas out of the hover
path entirely. The machine-side mystery is solved too: the flat
per-present cost came from the external monitor hanging off a USB-C dock's
indirect display path — see "Painting: still slow there" at the end.

## The problem, and what it is not

With a built-in brush selected (the default), hovering the canvas feels like
the crosshair is dragging behind the mouse on a Windows machine, while the
same build is fine on macOS. Display scaling (100% vs 125%) makes no
difference; neither does canvas size (lo-res reproduces it).

The bisection that pinned it (all on the affected machine, dev build, one
variable per step):

| Experiment | Result |
| --- | --- |
| `will-change: transform` on the cursor div (74b53c1) | still lags |
| Screen format to Lo-Res 320×256 | still lags |
| Red square tracked via `pointerrawupdate` (unaligned input) | trails the same |
| Minimal page: hidden native pointer + the app's crosshair SVG moved by transform per mousemove — no app code | **smooth** |
| Same minimal page + full-window WebGL canvas present (app's context flags), drawn once | **smooth** |
| In app: cursor div updated with raw client coords (no `getBoundingClientRect`/snapping) | still lags |
| In app: cursor div only — tool handlers and overlay preview skipped while hovering | **smooth** |
| In app: tool `onMouseMove` runs, overlay preview still skipped | **smooth** |
| In app: overlay preview on, cursor div off (the captured-brush configuration) | lags |
| Overlay context with `desynchronized: true` | still lags |
| Minimal page: per-mousemove commit to a transparent stacked WebGL canvas | **trails — in Chromium and Firefox alike** |
| The July 24 build (`5b6e6b1`) checked out and run on the same machine | **lags identically** |
| The July 15 build (`3f05f8c`, the evening the pointer landed) likewise | **lags identically** |
| Rebooting the machine | no change — the state is persistent, not wedged |
| Implemented DOM hover preview, this doc | **hover smooth**, both brush kinds |
| `chrome://gpu`: overlays all NONE, same Intel GPU enumerated under two LUIDs | indirect display driver in the present path |
| Same app on the laptop's built-in display instead of the USB-C-docked monitor | **everything smooth — painting included** |

**Root cause:** on this machine, any WebGL canvas commit issued per mousemove
adds a frame or more of input-to-photon latency — browser-independent,
size-independent, scaling-independent. The hover path commits the brush
preview to the overlay canvas on every move
(`FreehandTool.onMouseMoveOverlay` → `drawImage`), and the whole compositor
frame — the crosshair div riding in it — presents late. The div was never
the cost; frames containing a canvas commit are.

What it is **not**, each believed at some point along the way:

- *Not the cursor div's paint.* 74b53c1's `will-change` promotion changed
  nothing (the flag itself is harmless layer hygiene and stays, but its
  commit message's theory — repainting the surfaces beneath — is superseded
  by this doc).
- *Not the startup fit making the canvas big.* Correlation only; lo-res
  reproduces.
- *Not `mousemove`'s frame alignment.* `pointerrawupdate` trails identically:
  the latency sits after the event, in the present pipeline.
- *Not the per-move `getBoundingClientRect` snapping math.*
- *Not a Chromium regression.* Firefox trails the same on the minimal repro
  (`public/cursor-test.html`, keys `g` then `d`).
- **The "custom brush is smooth" comparison was an anchor artifact.** A
  captured brush shows the *native* cursor, which the OS draws on the
  hardware cursor plane outside the browser's frame pipeline — it stays
  tight no matter how late the frames present. Its overlay preview trails
  exactly like the built-in one's; the eye just follows the pointer instead.
  This is what sent 74b53c1 after the div.

Why it reads as "worked in July, broken in August": nothing in this code
path changed — the environment did. This is not inference: both the July 24
build (`5b6e6b1`) and the July 15 build (`3f05f8c`, the very evening the
app-drawn pointer landed) were checked out and run on the affected machine
at the end of the session, and both lag exactly like today's. No redpaint
version is smooth on today's machine, including the one remembered as
smooth. The machine that felt fine in mid-July no longer exists
(Windows/driver/compositor update; both browser engines sit on the same
DWM, and both trail). And macOS is not immune in principle; its compositor
simply presents these frames fast enough not to feel.

## Design

The machine composits DOM-layer transforms smoothly (proven above, twice).
So: while hovering, the brush preview becomes a DOM element and the overlay
canvas is not touched at all; painting is unchanged.

### Hover (no buttons down)

- The existing crosshair div stays exactly as is.
- A new **brush preview element** — a sibling of the crosshair div, also
  `position: fixed`, `will-change: transform`, `pointer-events: none` —
  shows the brush bitmap, moved per mousemove with the same buffer-pixel
  snapping as the crosshair, scaled to the canvas's on-screen pixel size
  (`image-rendering: pixelated`).
- The bitmap is rendered **once per brush change, never per move**: resolve
  the brush's pixels to displayable colors (the brush-save path already has
  this resolver — indexed via the palette, true color directly, transparency
  as alpha), draw into a small offscreen 2D canvas, use it as the element's
  content. Re-render on: brush identity/transform (`lastChanged`), Matte/
  Color mode and FG color changes, palette edits, and — because indexed
  colors should keep animating under Tab-cycling — on `cycleOffsets`
  changes, resolved through `displayPalette` (a few tiny redraws per second,
  nothing per mousemove).
- Tools' `onMouseMoveOverlay` hover draws are skipped centrally (the
  `Canvas.tsx` dispatch already distinguishes hover from drag via
  `event.buttons`), so no tool needs individual changes.

### Painting and dragging (buttons down)

Unchanged. The DOM preview hides on mousedown; strokes, shape previews and
selection feedback use the overlay pipeline exactly as today. Per-commit
latency while actually painting is the same latency every canvas-drawing
app pays on this machine, and while painting the eye tracks the committed
stroke, not the cursor.

### Deliberate tradeoffs

- **Symmetry hover indicators stay on the overlay canvas for now** — with
  symmetry on, hover keeps today's (trailing) behavior. DOM-ifying the
  indicator dots (a pooled set of divs) is a clean follow-up if it bothers;
  it is more moving parts than the first cut needs.
- **The zoom view keeps its hover ghost via a twin DOM element.** The zoom
  view mirrors the overlay canvas, which is now empty while hovering — so
  the magnified pre-click brush ghost (real aiming feedback, and DPaint
  showed it) would silently vanish. Instead of accepting that, the hover
  preview is two elements sharing one rasterized bitmap: one over the main
  canvas at display scale, one over the zoom canvas scaled by the zoom
  magnification and positioned through the zoom view's existing pan/focus
  mapping (the same transform its input handling already uses). One
  mousemove updates both transforms; still zero canvas commits. In-drag
  previews and committed pixels mirror through the canvas pipeline exactly
  as today.
- **CycleDriver's overlay replay** sees an empty frame list while hovering —
  nothing to replay, nothing breaks; the DOM preview animates through its
  own `displayPalette` subscription instead.

## Verification (when implemented)

- On the affected Windows machine: hover with a built-in brush — crosshair
  and brush preview track like the native cursor did; `public/cursor-test.html`
  remains the reference feel. Then paint — stroke feedback unchanged.
- Custom/captured brush hover now also shows its preview without the canvas
  commit — same smoothness, native cursor still shown there.
- Tab-cycling while hovering: the DOM preview's indexed colors animate.
- Matte/Color modes, FG color changes, brush transforms (x/y/z/h/H…):
  preview re-renders correctly on each.
- Symmetry on: today's behavior (documented tradeoff).
- Zoom mode: hovering the main canvas shows the magnified ghost in the zoom
  view (the twin element), smooth on the affected machine; scrolling/zooming
  the view keeps the ghost mapped correctly; in-drag previews still mirror
  through the canvas as before.
- macOS: no regression — the DOM path is cheaper there too.

## Painting: still slow there, and why that's out of scope

With hover fixed, the same machine still slows down *while painting* — and
not as a stroke trailing a fast cursor: the whole frame pipeline (the
crosshair too) drops in rate during a stroke. Also bisected live, everything
falsified:

- Not a regression from this feature (the deployed pre-feature build paints
  equally slowly there) and not canvas-size-dependent (Lo-Res the same).
- `desynchronized: true` on the opaque painting canvas made painting
  **extremely** slow — it evidently fights `preserveDrawingBuffer: true`
  (copy or software path per commit) rather than falling back silently.
  Disqualified as long as pDB stays; the pDB removal the TODO already wants
  for Safari would be the prerequisite for re-testing it.
- Coalescing screen presents to once per animation frame (index to the FBO
  per event, render to screen per rAF) did not help — so it is not the
  *count* of composites but their per-commit cost, at ~60/s, that saturates.
- `powerPreference: 'high-performance'` on the painting context: no change
  (the dual-GPU cross-adapter-copy theory).
- `preserveDrawingBuffer: false` (with full renders replacing incremental
  draws for the test): no change — the copy-on-present that pDB forces is
  not the tax either, so the pDB-removal rework the Safari TODO wants would
  not help this machine (it remains worthwhile for Safari on its own).
- Dirty-rect rendering (the standing TODO) would not help either, by the
  same evidence: it shrinks per-commit *pixel* work, and Lo-Res already
  proved pixel count irrelevant here.
- A reboot changed nothing: the machine's state is persistently degraded,
  not wedged.

Unlike hover, painting cannot avoid per-move canvas commits — that is what
painting is — so there is no by-construction fix; this is machine-level.

**Resolved: it was the monitor's connection, not the machine.** The
`chrome://gpu` dump showed hardware overlay support entirely absent (every
format NONE — impossible for a healthy Meteor Lake iGPU) and the same Intel
GPU enumerated under two different LUIDs — the signature of an **indirect
display driver**: the external monitor hangs off a USB-C dock's USB-graphics
path, so every present is copied/encoded through the dock instead of scanned
out — a flat per-frame fee that ignores pixel counts, browsers, and WebGL
flags, exactly the profile every experiment above measured. Confirmed by
moving the browser to the laptop's built-in display: everything, painting
included, is smooth there. This also explains the native cursor's immunity —
indirect display drivers move the pointer through their own hardware-cursor
path without re-presenting the frame — which is the asymmetry that
originally framed the app-drawn cursor as the suspect.

Remedy is at the desk, not in the code: connect the monitor through a direct
HDMI/DisplayPort output (or a dock port that passes DP alt-mode natively,
rather than USB-graphics). The DOM hover preview stays valuable regardless —
docked laptops are common, and it makes hover immune to any such display
path by construction.

## Out of scope

- OS/driver archaeology beyond the pointers above. The hover design removes
  the dependency on it; painting throughput (above) is where the machine
  still owes an answer.
- `public/cursor-test.html` stays in the repo as the diagnostic harness this
  session used; it is dev-server-only surface (three keys: `g`, `d`, and
  mouse) and costs nothing.
