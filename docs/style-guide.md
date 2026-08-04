# redpaint UI style guide

What keeps the app reading as one period machine while its parts get built
in different sessions. The retro feel lives in a small set of hard rules —
drift happens when intent lives only in the existing pixels, so the intent
is written down here. When adding UI, check against this; when deliberately
breaking it, update it.

## Palette

The Workbench 1.3 four, plus bookkeeping colors:

Every one of these is a CSS custom property in `src/index.css` — use the
property, never the literal. They were hand-typed at 46 sites before this,
which is how the transparency checkerboard below ended up with two different
sets of values.

| Role                                                            | Property         | Value                                                                                     |
| --------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| Workbench blue (panel ground, pressed gadgets)                  | `--wb-blue`      | `rgb(0, 85, 170)`                                                                         |
| Deep blue (pressed-in inset shadow)                             | `--wb-deep-blue` | `rgb(0, 51, 102)`                                                                         |
| Workbench orange (accent: hover, selected labels, armed states) | `--wb-orange`    | `#ff8800`                                                                                 |
| Paper / gadget face                                             | `--paper`        | `rgb(242, 242, 242)` (`#ffffff` where a control wants pure white)                         |
| Ink (borders, shadows, labels)                                  | —                | the `black` keyword                                                                       |
| Disabled / dim label                                            | `--dim-label`    | `rgb(130,130,130)`, at `0.45` alpha for a single disabled segment inside an enabled group |

Two deliberate exceptions to "use the property": black stays the `black`
keyword (nothing to get wrong), and `pixelIcons.tsx` keeps literal copies of
the blue and orange because it feeds them to SVG `fill` attributes, which
don't resolve `var()`.

**Blue also means "this is a value."** Beyond its ground/pressed roles,
`--wb-blue` is the ink for a readout's number wherever one sits beside a
label or a mode name — ScreenStatus's dimensions and palette count, the load
preview's colour count, the menubar's live crop size and rotate angle. It
leaves orange free to mean "armed" rather than having to carry the figure as
well, and a Press Start 2P readout beside a 24px name takes the next size
down (16px) so the two sit on one baseline as a single line of text.

Semantic exceptions, deliberately scarce:

- **One rainbow, ever.** The TRUE COLOR `ON` gradient is the only gradient
  in the app. Its whole job is being the lone spectrum in a flat-color
  world; a second gradient anywhere kills it.
- Red is the menubar title's paint dot and error/live signals, not an
  accent.
- **Transparency checkerboard**, `#e8e8e8`/`#cfcfcf` in 12px squares, on any
  surface where "the canvas shows through here" is the point: the load
  preview, an occupied brush slot. Not the Fill Style preview, which paints
  the current background color behind its ellipse instead — a fill only means
  anything against what it will sit on, and the checker was answering a
  question nobody had while covering the answer to the one they did. Worth
  asking before reaching for it: is the transparency the subject here, or
  just the backdrop? Never
  hand-rolled per component — apply the `.transparency-checker` class
  (defined once in `index.css`, off `--checker-*` custom properties), which
  exists because this drifted into a second set of colors and cell size the
  moment it was written out by hand a third time. Hard-stopped gradients, so
  it paints flat squares with no ramp and the rainbow rule above stands. Not
  decoration — don't use it anywhere the transparency it signals isn't real.
  The dark pasteboard around both canvas views (`Canvas.css`) is also a
  checker, but it means "outside the page" and deliberately looks nothing
  like this one. The zoom divider between those views used to be a third
  checker and is now a plain `--paper` panel edge: nothing shows through it
  and nothing lies outside the page there — it is chrome, so it takes the
  same ground as every other piece of chrome.

## Chrome (where the DPaint feel actually lives)

These rules are absolute — they, not icon style, make the app read retro:

- 2px solid black borders; neighbouring gadgets share a single 2px seam
  (collapse the doubled edge, as RetroToggle and the gadget groups do).
- One hard drop shadow per _group_ (`4px 4px 0 0 black`), never per
  segment, never blurred.
- Pressed-in = Workbench blue fill, orange label, inset `3px 3px 0 0` deep
  blue. Hover = orange fill, white label. Disabled = dimmed label, no hover
  feedback.
- No border-radius, with two scoped exceptions: the transform gadgets'
  keycap hint (see "Text on controls" below) and **fields you type into**
  (`.retro-input` in `index.css` — the number fields and the readout beside
  a `RetroLabeledSlider`). Those take a softer, rounded, 2px-shadowed
  treatment deliberately, so a field reads as something you type in rather
  than a button you press; on focus they press in (blue ring, shadow
  halves, 1px translate) the way a gadget does. Apply the shared class,
  never restyle an input per component — this drifted into two different
  treatments the first time it was written out twice. No gradients (see the
  rainbow rule). No transparency except the menu panel's ground and the
  deliberate dim-label colors.
- Gadgets on a row share one fixed height so seams and shadows line up.

## Sizes and scaling

Chrome is laid out in hardcoded CSS pixels, deliberately — the retro look is
a pixel grid, and the type sizes below only work on 8px multiples. It stays
that way. What flexes instead is the whole chrome at once, through the
**UI Size** setting in the menu panel (`src/uiScale.ts`): a CSS `zoom` on the
menubar, menu panel, toolbox column and requesters, for OS display scaling
(Windows at 125% leaves a 1080p screen only 864 CSS px tall) and short
laptop screens. Consequences for new UI:

- Keep writing plain px. Don't reach for `rem`, `vh`-based type sizes, or
  `clamp()` to make something "responsive" — a fractional Press Start 2P
  size blurs the bitmap face, and the scale steps (80/75/67%) are chosen as
  inverses of the common OS scaling factors so a scaled UI still lands on
  whole device pixels.
- A **viewport unit inside a zoomed container must be divided by
  `var(--ui-scale, 1)`** — `zoom` multiplies computed lengths, and `vh`
  arrives unconverted, so an undivided `100vh` means 80% of the window at
  80%. Percentages need no compensation (the containing block is converted
  first). Grep `--ui-scale` for the existing sites.
- Requesters (`Modal.tsx`) cap at the viewport height and scroll their body,
  with the header and footer buttons pinned. Anything tall belongs in the
  body, and the OK/Cancel row stays the modal's last children so the footer
  split finds it. Leave a requester's own width enough slack to give the
  scrollbar its ~15px without the content losing anything — Fill Style's 820
  covers it, and its two-column layout means it no longer needs the scroll on
  a 125%-scaled 1080p screen at all.
- **Scrollbars** anywhere (requester body, menu panel, either canvas view)
  use the shared `.retro-scrollbar` class from `index.css`, never
  hand-rolled per component. They keep the platform's rounded, inset shape —
  deliberately not rebuilt as a squared-off Workbench trough, since a bar
  that only appears when a panel doesn't fit is the wrong place for that
  weight — and take only the palette: the thumb is `--scrollbar-thumb` (set
  per ground: the shared blue default on paper and on the canvas views' dark
  pasteboard, white on the menu panel's own blue) and turns orange on hover
  like every other control. The corner square where two bars meet is
  transparent like the track — Blink paints it white otherwise, which reads
  as a stray tile on any dark ground.

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

## Capitalization

UI text defaults to Title Case — every word capitalized ("Color Palette",
"Indexed Palette Size", "Remap To Current Palette") — across dialog
headers, fieldset legends, and toggle/button labels alike. Exceptions are
deliberate, not oversights:

- **All-caps** where a control has its own register that calls for it —
  e.g. the 11px letter-spaced status captions above ScreenStatus's values
  (Typography above). Don't extend all-caps to ordinary labels.
- **Sentence case** for hint/prose text that reads as a sentence, not a
  title — the small supporting text under a slider, tooltips, error/warning
  copy.

## Icons: two registers

**Identity icons (nouns)** — the disk, the paintbrush, someday brush-slot
thumbnails. Multicolor WB 1.3-style pixel art (`pixelIcons.tsx`, ASCII maps
rendered to crispEdges rects). Few, decorative, memorable. Workbench itself
paired austere gadget chrome with lavish multicolor disk icons — this mix
is period-authentic. **Draw them from the four palette colors above only:
black, white, Workbench blue, Workbench orange** — the same inks as the
chrome around them, no icon-only near-misses. Two of those crept in and were
removed (an `#0a0a28` navy a hair off black, a `#0000ff` a hair off the
Workbench blue); at icon size neither was distinguishable from the color it
shadowed, so all they bought was a wider palette. Mind the grounds an icon
sits on: a pressed gadget is Workbench blue and hover is orange, so those
exact colors risk vanishing there. A full 1-2px outline around every fill
color (the black outline around the brush's blue handle) is what keeps a
same-hue fill readable on a same-hue ground — an unoutlined fill in the
gadget's own pressed/hover color would still vanish.

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
  _horizontal_ (icon left: the rail's Picture/Brush/Prefs and the drawer's
  File gadgets) or _stacked_ (icon centered above the label: the transform
  gadgets, giving them the classic toolbar-button silhouette and, with
  longer labels, a narrower footprint). One layout per group, never mixed
  within one.
- **RetroToggle**: text-only segments, plus the Mode toggle's own keycap
  exception below, and the Fill Style dialog's gradient-axis toggle, which
  uses icon segments instead (`gradientAxisIcons.tsx`) — DPaint's Fill Type
  requester shows the axis as an arrow, not a word, and the icons also let
  the toggle sit in one row instead of a three-row stack. Same action-glyph
  register as `transformIcons.tsx` (currentColor stroke, no fill, so hover/
  selected/disabled coloring comes free), except the Horizontal Line glyph
  swaps in round caps/joins for its curved arrowheads, the detail that sets
  it apart from plain Horizontal's sharp ones. A per-segment `title` tooltip
  carries the text name that the icon itself doesn't.
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
