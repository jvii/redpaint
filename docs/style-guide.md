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
- No border-radius. No gradients (see the rainbow rule). No transparency
  except the menu panel's ground and the deliberate dim-label colors.
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
Workbench blue and hover is orange, so those exact colors vanish there
(the brush got white bristles for this reason).

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
- **RetroToggle**: always text-only segments.
- **Toolbox**: always icon-only (it is a compact palette).
- Keyboard shortcuts live in gadget `title` tooltips, not in labels.

## Interaction

- Armed modal states (drag transforms) show three signals: the menubar mode
  slot names the mode in orange, the cursor changes to the matching
  affordance, and the on-canvas preview carries the marquee. New modal
  tools reuse all three.
- Menu panels are UI chrome: `user-select: none`.
- Panel heights are measured from content, never hand-tuned pixel
  constants.
