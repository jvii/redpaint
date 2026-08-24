# DPaint II parity: what is left

Audited 2026-08-24 against the DPaint II manual's Reference chapter (menus and
toolbox) and DPaint I's `MENU.C`, both in `docs/reference/`. Parity with II is
the objective (docs/dpaint-versions.md), so this is the list that ends.

## Reached

Every toolbox drawing tool: dotted and continuous freehand, line, curve, fill,
airbrush, rectangle, circle, ellipse, polygon, text, brush selector, magnify,
undo, clear, symmetry. All eight paint modes including Smooth. Every brush
transform, the brush handle, and Change Color. The whole Color Control submenu,
cycling and ranges included, and Remap for both picture and brush. Spare page
with both merges, page size, load and save for pictures and brushes, the font
requester.

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

**Spacing requester.** Command-click the line or dotted freehand tool to set
splat spacing — absolute (pixels between splats) or relative (splats per line).
Small, and the dotted freehand tool is already there to want it.

**Cut / Copy / Paste.** The Edit menu clipboard. We have a paste buffer for
images arriving from outside, not the internal clipboard.

**Prefs oddments.** Coordinates, Fast Feedback, Info Bar, Excl Brush, Square
Aspect. Each is one flag; none is interesting alone.

**Print.** Declined rather than missing — a browser prints the page, and a paint
program's print pipeline is a different problem.

## Order

Stencil first: it is the one whose absence other features keep running into, and
it is what makes Fix Background mean anything. Spacing after it, being small and
close to work already done. Perspective last of the three real gaps — large,
self-contained, and the least reached for.
