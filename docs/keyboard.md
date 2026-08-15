# Keyboard

Every binding in the app, and where it came from. Implemented in
`src/components/GlobalHotkeyManager.tsx`; the caps shown in the UI come from
the same letters (`src/components/toolbox/toolboxHints.ts`,
`src/components/menu/BrushMenu.tsx`).

The source of the tool and brush keys is the DeluxePaint II manual's
**"Keyboard Commands and Cursors"** table (`docs/reference/dpaint2-manual/`,
gitignored — see `docs/reference/README.md`). They were taken from it rather
than chosen, mnemonics and all.

## Two conventions, deliberately not merged

**Case is the binding.** DPaint's reference card writes a shifted key as a
capital: `h` halves the brush, `H` doubles it, `r` is the outline rectangle and
`R` the filled one. The handlers switch on `event.key`, so this is literally
how the code reads.

**Caps spell the chord.** Case cannot carry the shift state on screen the way
it does in the code: a lone `H` reads as a key you press unmodified, and `⇧h`
fixes that but names a key nobody has — no keyboard is engraved with a
lowercase `r`. So the letter on a cap is always uppercase and the ⇧ carries the
whole of the shift state, which is how every OS writes a shortcut:

| binding | cap |
| --- | --- |
| `r` | `R` |
| `R` | `⇧R` |

Every cap in the UI goes through `shortcutCap()`
(`src/components/ui/shortcutCap.ts`). So the code and this file say `R` where
the screen says `⇧R`, on purpose — the tables below are in the code's
convention, since that is what you would grep for.

## Toolbox

| Key | Does | Source |
| --- | --- | --- |
| `s` | Dotted Freehand | manual (mnemonic "sketch") |
| `d` | Freehand | manual ("draw") |
| `v` | Line | manual ("vector") |
| `q` | Curve | manual ("qurve") |
| `f` | Flood Fill | manual |
| `F` | Fill Style settings, selecting Flood Fill | manual (Fill Type dialog) |
| `r` / `R` | Rectangle outline / filled | manual |
| `c` / `C` | Circle outline / filled | manual |
| `e` / `E` | Ellipse outline / filled | manual |
| `b` | Brush Selector | manual |
| `t` | Text | manual |
| `Escape` | leave the Text tool, back to Freehand | manual ("Press ESC ... to exit Text mode") |
| `m` | Magnify | manual |
| `/` | Symmetry | manual |
| `K` | Clear page | manual |
| `,` | pick a foreground color off the canvas | manual ("Select Color cursor") |
| `p` | Palette editor | manual ("Palette Window") — opens only, see below |
| `u` | Undo | manual |
| `⌘Z` / `Ctrl+Z`, `⇧⌘Z` / `Ctrl+Y` | Undo / Redo | not DPaint's; what everyone else uses |

**Airbrush and Polygon have no key** because DPaint gave them none. Its table
runs `b B c C d D e E f F g G j K m p q r R s t u v` with no gap either could
sit in, and inventing two would be the only part of this set that was not the
manual's. The letters going spare are ones DPaint spent on features redpaint may
still grow: `g`/`G` grid, `j` spare page, `D` freehand with a one-pixel brush.

## Brush

`docs/brush-transforms.md` covers these; they are DPaint's too.

| Key | Does |
| --- | --- |
| `x` / `y` | flip horizontal / vertical |
| `z` | rotate 90° |
| `h` / `H` | halve / double |
| `X` / `Y` | double horizontally / vertically |
| `B` | restore the last custom brush |
| `Z` | Stretch (arms a drag) |
| `S` | Shear (arms a drag) |
| `Escape` | cancel an armed drag transform |
| `F1`–`F8` | brush mode, in `MODE_ORDER` |

Rotate Any Angle has **no key**, and neither does either Bend. That is
DPaint's arrangement rather than a gap: it has all of them — ROTATE drags the
brush about its bottom-left corner — and gives none of them a keyboard
equivalent, where the Flip, Stretch, Halve and Double entries around them each
have one. Shear's `S` is the same case: DPaint has the transform, so only the
binding is redpaint's.

Rotate Any Angle did hold `R` here for a while, and it is the one that had to
go, because `R` is DPaint's Filled Rectangle. Keeping it left the rectangle the
one shape whose filled half was unreachable from the keyboard while circle and
ellipse both were. `S` and `Z` stay — nothing in the toolbox wants either.

## Global

| Key | Does |
| --- | --- |
| `Space`, middle-click | toggle the menu |
| `Tab` | toggle color cycling |
| `j` | swap to the other page (manual: "Spare Page") |
| `J` | copy this page onto the other one (not in the manual; PyDPainter's binding) |

## When hotkeys are off

`hotkeysSuspended()` turns everything above off while a text field has focus, a
dialog or requester is open, the palette editor or symmetry settings are up, a
crop is armed, or a Text tool is active. `Tab` is exempt — cycling is
display-only and the point of it is to toggle while tuning a range in the
palette editor.

Two consequences worth knowing:

- **`p` opens the palette editor but cannot close it**, because the editor is
  one of the things that suspends. Reaching past the guard to make one key
  toggle it would also be the wrong shape: a palette mid-edit has OK and
  Cancel, and a key that means neither would have to pick one silently.
- **`Escape` out of the Text tool is checked before the guard**, because the
  Text tool suspends everything — without that, `t` is a keyboard trap with no
  key out, including the keys that would pick a different tool.
