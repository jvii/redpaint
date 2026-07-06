# Palette grid marks — layout rules

Visual rules for the swatch grid in `Palette`/`ColorButton`
(`src/components/palette/`), covering the column divider, the Range
bracket, and the selection ring. Rules only — see the component source for
how each is actually built.

## Grid

- 32 colors laid out as 4 columns of 8, filled **column-major**: color 1 is
  the top of column 1, color 8 its bottom, color 9 the top of column 2, and
  so on. Matches DPaint's own numbering.
- The toolbox sidebar palette and the palette editor's grid always show
  colors in the same positions.
- The toolbox palette stretches to fill the sidebar's available height
  (rows sized evenly, not necessarily square). The palette editor's grid
  uses fixed square cells instead.

## Column divider

- A thin black rule between every pair of adjacent columns, spanning the
  full height of the grid.
- Present **only in the palette editor** — the toolbox palette has no
  dividers.
- Same thickness as the Range bracket and the selection ring.

## Range bracket

- Every color that's a member of the currently-active range gets a white
  mark on its left edge.
- The range's first (lowest-numbered) color additionally gets a short white
  cap across its top-left corner, and its last (highest-numbered) color a
  matching cap across its bottom-left corner — marking the start and end of
  the bracket.
- Where a range mark and a column divider fall on the same edge, the white
  range mark wins outright — the divider does not also show through or
  alongside it.

## Selection ring

- The currently-selected color gets a ring around all four sides.
- **Left, top, bottom**: the ring expands outward past the swatch's own
  edge, overlapping whatever is next door.
  - In the toolbox palette, that means overlapping the neighboring
    swatch's real color.
  - In the palette editor, on the left/top/bottom, it's the same: expands
    into the neighbor.
- **Right**, specifically in the palette editor and only when this isn't
  the rightmost column: the ring does **not** push into the neighboring
  swatch's real color. It replaces exactly the column divider that would
  otherwise be there — stopping right at the boundary, no further.
- **Right**, in the toolbox palette, or when the selected swatch is in the
  rightmost column: no divider exists to replace, so the ring behaves like
  every other side and expands outward into whatever's there.
- Whenever the ring is adjacent to a column divider, the divider does not
  show through — the ring fully replaces it at that edge.
- The ring's four corners must always be fully connected — no gaps at any
  corner, regardless of which sides are expanding outward vs. staying inset.
- Same thickness as the column divider and the Range bracket.
