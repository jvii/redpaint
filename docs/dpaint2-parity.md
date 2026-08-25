# DPaint II parity: what is left

Audited 2026-08-24 against the DPaint II manual's Reference chapter (menus and
toolbox) and DPaint I's `MENU.C`, both in `docs/reference/`. Parity with II is
the objective (docs/dpaint-versions.md), so this is the list that ends.

Revised 2026-08-25: the first pass read the Reference chapter out of the IIGS
manual, whose Edit menu does not exist on the Amiga, and invented gaps from it
(a clipboard, an Info Bar toggle, Square Aspect). Menu contents here now come
from the German Handbuch, which is the Amiga edition — `PLATFORM_NOTE.md` says
to prefer it, and this is what ignoring that costs.

## Reached

Every toolbox drawing tool: dotted and continuous freehand, line, curve, fill,
airbrush, rectangle, circle, ellipse, polygon, text, brush selector, magnify,
undo, clear, symmetry. All eight paint modes including Smooth. Every brush
transform, the brush handle, and Change Color. The whole Color Control submenu,
cycling and ranges included, and Remap for both picture and brush. Spare page
with both merges, page size, load and save for pictures and brushes, the font
requester.

Coords too, as of 2026-08-25: the Prefs toggle, in its own slot at the menu
bar's right-hand end, absolute, or measuring the drag while a button is held.

Past it in one place: Copy and Paste, in both drawers, moving pictures and
brushes through the OS clipboard. The Amiga DPaint II has no Edit menu and no
clipboard — an earlier revision of this file listed one as missing, having
taken it from the IIGS manual text (`PLATFORM_NOTE.md`).

## Missing

**Stencil.** The largest gap, and it is a system rather than a menu item: lock
chosen colors so painting cannot touch them, with make/free/reverse/toggle, plus
Lock Foreground. It also changes what other tools do — in III it constrains brush
pickup, and fills respect it throughout.

**Fix / Free Background.** The stencil's companion: freeze the current picture as
a background that painting leaves alone.

**Perspective.** The second large one: a 3D grid with its own spacing and
movement keys, brushes drawn in perspective. Self-contained, and the only DPaint
II feature with a genuinely different interaction model.

**Grid.** A toolbox toggle with its own spacing requester on right-click and `g`
as its key, snapping coordinates to an 8x8 grid by default. It keeps a grid
origin that shifts when the grid is toggled, so turning it on does not move the
brush you are holding. Not to be confused with Perspective's grid, which is a
different thing that happens to share the word.

**Spacing requester.** Command-click the line or dotted freehand tool to set
splat spacing — absolute (pixels between splats) or relative (splats per line).
Small, and the dotted freehand tool is already there to want it.

**MultiCycle.** A Prefs flag, but not an oddment: it decides what Cycle mode
does with a multi-color brush. Off, the brush cycles as one color (the
foreground); on, every color in it cycles, each within whichever range it
belongs to.

**Non-square pixels.** Not a DPaint menu item — DPaint corrects for these
unconditionally, and we do not correct at all, so circles, the airbrush and
symmetry come out 2:1 wrong on Med-Res and Interlace. Four sites, all at the
tool boundary: docs/pixel-aspect.md.

**ExclBrush.** With Grid on, brush pickup drops the right and bottom edge of
the one-pixel border, so a pattern made from the brush keeps a single-width
border instead of a doubled one. Waits on Grid.

## Declined

**Be Square.** DPaint II's finer aspect correction, on top of the unconditional
one. It exists because an Amiga Lo-Res pixel is about 1.2:1 on a 4:3 display,
which the original's power-of-two mapping cannot express. A browser's pixels
are square and our formats are only ever 1:1 or 2:1, so there is no residue for
it to correct (docs/pixel-aspect.md). An earlier revision of this file listed
it as the whole of the aspect story, which had it backwards.

**Fast FB.** Faster, coarser feedback while drawing, for hardware that could
not keep up. Nothing here is waiting on it.

**Workbench.** Shows and hides the Amiga Workbench screen, which a browser has
no equivalent of.

**Print.** A browser prints the page, and a paint program's print pipeline is a
different problem.

## Order

Stencil next: the one whose absence other features keep running into, and what
makes Fix Background mean anything. Grid after it, with Spacing and ExclBrush
behind it — both attach to it. MultiCycle whenever Cycle mode is next open.
Perspective last: large, self-contained, and the least reached for.

Non-square pixels sit outside that order: it is a correctness bug rather than a
missing feature, and the four sites are independent of everything above.
