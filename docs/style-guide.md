# redpaint UI style guide

What keeps the app reading as one period machine while its parts get built
in different sessions. The retro feel lives in a small set of hard rules —
drift happens when intent lives only in the existing pixels, so the intent
is written down here. When adding UI, check against this; when deliberately
breaking it, update it.

## Palette

The Workbench 1.3 four, plus bookkeeping colors:

| Role                                                            | Value                                            |
| --------------------------------------------------------------- | ------------------------------------------------ |
| Workbench blue (panel ground, pressed gadgets)                  | `rgb(0, 85, 170)`                                |
| Deep blue (pressed-in inset shadow)                             | `rgb(0, 51, 102)`                                |
| Workbench orange (accent: hover, selected labels, armed states) | `#ff8800`                                        |
| Paper / gadget face                                             | `#ffffff` / `rgb(242, 242, 242)`                 |
| Ink (borders, shadows, labels)                                  | `#000000`                                        |
| Disabled / dim label                                            | `#8888aa` (on blue), `rgb(130,130,130)` group-disabled / `rgba(130,130,130,0.45)` single-segment-disabled (on face) |
| Icon navy (pixel-icon outlines/bodies)                          | `#0a0a28`                                        |

Semantic exceptions, deliberately scarce:

- **One rainbow, ever.** The TRUE COLOR `ON` gradient is the only gradient
  in the app. Its whole job is being the lone spectrum in a flat-color
  world; a second gradient anywhere kills it.
- Red is the menubar title's paint dot and error/live signals, not an
  accent.

## Chrome (where the DPaint feel actually lives)

These rules are absolute — they, not icon style, make the app read retro:

- 2px solid black borders; neighbouring gadgets share a single 2px seam
  (collapse the doubled edge, as RetroToggle and the gadget groups do).
- One hard drop shadow per _group_ (`4px 4px 0 0 black`), never per
  segment, never blurred.
- Pressed-in = Workbench blue fill, orange label, inset `3px 3px 0 0` deep
  blue. Hover = orange fill, white label. Disabled = dimmed label, no hover
  feedback.
- No border-radius (the transform gadgets' keycap hint is the one
  exception — see "Text on controls" below). No gradients (see the
  rainbow rule). No transparency except the menu panel's ground and the
  deliberate dim-label colors.
- Gadgets on a row share one fixed height so seams and shadows line up.

## Typography

- Press Start 2P for every piece of UI text, `-webkit-font-smoothing: none`.
- **16px minimum for Press Start 2P.** The bitmap glyphs only read crisply
  at multiples of 8, so its sizes stay on 16/24/32 — 8px captions were
  tried and dropped.
- **Below 16px, use the plain monospace stack** —
  `ui-monospace, 'SF Mono', Menlo, Consolas, monospace` — for small
  supporting text: the caption labels above status values (11px,
  uppercase, letter-spaced), slider value readouts, and similar fine print.
  Small monospace beside the bitmap face is itself a period pairing
  (system console text next to chunky title text).
- **`-webkit-font-smoothing: none` is inherited — every monospace-stack
  element needs its own `-webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;`, even if no ancestor sets `none`
  today.** A monospace label nested inside a Press Start 2P container (a
  gadget, a cluster head, a modal window) silently inherits that `none`
  otherwise — the bitmap face wants it, the system font doesn't, and
  Safari (unlike Chrome) actually renders the difference: unsmoothed
  system-font text comes out visibly thinner/blurrier there, not crisper.
  Never rely on inheriting `antialiased` from `body` — the nearest
  ancestor's `none` always wins, and that ancestor changes as the
  component tree is refactored.
- Two heading treatments in panels: _section heads_ (white, 2px white
  underline — Mode, Brush) and _sub-heads_ (dimmed white, letter-spaced, no
  rule — File/Size/Flip/Rotate/Bend). One rule per section, not per
  cluster: a panel full of underlines is noise, not structure.

## Icons: two registers

**Identity icons (nouns)** — the disk, the paintbrush, someday brush-slot
thumbnails. Multicolor WB 1.3-style pixel art (`pixelIcons.tsx`, ASCII maps
rendered to crispEdges rects). Few, decorative, memorable. Workbench itself
paired austere gadget chrome with lavish multicolor disk icons — this mix
is period-authentic. Mind the grounds an icon sits on: a pressed gadget is
Workbench blue and hover is orange, so those exact colors risk vanishing
there. A full 1-2px outline around every fill color (the brush's navy
outline around its blue handle) is what keeps a same-hue fill readable on
a same-hue ground — an unoutlined fill in the gadget's own pressed/hover
color would still vanish.

**Action glyphs (verbs)** — transforms, toolbox tools. Single-color line
drawings: `currentColor` stroke so they follow the gadget's
hover/disabled/pressed color, 2px stroke, **square caps and miter joins**
(`transformIcons.tsx`). Rounded caps are the modern-web tell; sharp line
ends read like a crisp 1-bit drawing at native resolution — which is what
period toolbar glyphs actually were. On an Amiga everything was pixels;
today's equivalent of that crispness is a clean vector glyph, not a
fat-pixel one.

The built-in-brush dots in the toolbox are neither register: they are
literal pictures of the pixels they paint — content, not iconography.

## Text on controls, per control type

Consistency is judged within each control type, not across them:

- **Menu gadgets**: always icon + 16px label, in one of two layouts —
  _horizontal_ (icon left: the rail's Open/Save/Brush and the drawer's File
  gadgets) or _stacked_ (icon centered above the label: the transform
  gadgets, giving them the classic toolbar-button silhouette and, with
  longer labels, a narrower footprint). One layout per group, never mixed
  within one.
- **RetroToggle**: text-only segments, plus the Mode toggle's own keycap
  exception below.
- **Toolbox**: always icon-only (it is a compact palette).
- Keyboard shortcuts live in gadget `title` tooltips, plus a monospace
  keycap on two controls that get one, styled with a shared base class
  (`.wb-gadget__keycap`, `MenuGadgets.css`) so they read as one system: a
  bordered, 3px-`border-radius`ed single letter — the radius is a
  deliberate, scoped exception to the Chrome section's "no border-radius"
  rule, the only rounded corner in the app, there because a keycap needs to
  read as a keycap rather than another squared-off gadget.
  `color`/`border-color: currentColor` on both so the cap always tracks its
  button's own hover/pressed/disabled state for free, no extra rules.
  - **Stacked transform gadgets** (`Gadget`'s `shortcut` prop): after the
    label, same line, at the label's own 16px rather than the smaller
    supporting-text sizes the Typography section otherwise reserves
    monospace for — inline so the hint costs width (gadgets already vary in
    width with label length) instead of height. `⇧`-prefixed when the
    actual chord is Shift+key (e.g. Stretch's key is `Z`, shown as `⇧z`, not
    `z`). Gadgets with no hotkey (Bend H/V) just omit it.
  - **The Mode toggle's segments** (`Menu.tsx`, F1-F8): below the label
    (`.menu__mode-label`, a column stack), one size step down at 14px
    (`.menu__mode-keycap`) — 8 segments packed into one row, each already
    inside RetroToggle's roomier segment padding, reads more spacious than a
    transform cluster's 2-3 gadgets, so the same 16px here felt oversized
    next to the label.
  - Horizontal-layout gadgets (rail, drawer File row) don't get a keycap —
    that layout has no stacked/columnar slot to put one in.

## Interaction

- Armed modal states (drag transforms) show three signals: the menubar mode
  slot names the mode in orange, the cursor changes to the matching
  affordance, and the on-canvas preview carries the marquee. New modal
  tools reuse all three.
- Menu panels are UI chrome: `user-select: none`.
- Panel heights are measured from content, never hand-tuned pixel
  constants.
