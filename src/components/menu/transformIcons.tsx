import { JSX } from 'react';

// Action glyphs for the drawer's transform gadgets (see docs/style-guide.md):
// single-color line drawings, 24x24 viewBox, currentColor stroke, no fill, so
// they scale smoothly and inherit the gadget's hover/disabled/pressed color.
// Square caps and miter joins, not rounded. The crisp line-ends read like a
// sharp 1-bit drawing at native resolution, which is what period toolbar glyphs
// actually were; rounded caps are the modern-web tell. The disk and brush
// identity icons stay pixel art (pixelIcons.tsx).

type IconProps = { size?: number };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
};

// two standard arrows pointing away from a dashed mirror axis. Exact coordinate
// reflections of each other, so the glyph is symmetric by construction, and the
// arrow style matches the other transform icons
export function FlipHIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="3 3" />
      <line x1="10.5" y1="12" x2="2" y2="12" />
      <polyline points="6,7 2,12 6,17" />
      <line x1="13.5" y1="12" x2="22" y2="12" />
      <polyline points="18,7 22,12 18,17" />
    </svg>
  );
}

export function FlipVIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="3 3" />
      <line x1="12" y1="10.5" x2="12" y2="2" />
      <polyline points="7,6 12,2 17,6" />
      <line x1="12" y1="13.5" x2="12" y2="22" />
      <polyline points="7,18 12,22 17,18" />
    </svg>
  );
}

// a right angle (the two legs, plus the small square notch that marks it as
// exactly 90°) with a quarter-circle arrow sweeping between the legs' ends,
// so the glyph reads as "turn by this exact corner"
export function Rotate90Icon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <path d="M22 22H3V3" />
      <path d="M3 16h6v6" />
      <path d="M7 3A19 19 0 0 1 22 18" />
      <polyline points="18,15 22,18 24,14" />
    </svg>
  );
}

// the standard rotate-cw glyph: a near-full circle sweeping into its own
// arrowhead at the top right
export function RotateAnyIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <polyline points="21,3 21,8 16,8" />
    </svg>
  );
}

// the classic "minimize" glyph: corner brackets pulled in toward the
// center, each trailing a short diagonal out to its true corner
export function HalveIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <polyline points="4,14 10,14 10,20" />
      <polyline points="20,10 14,10 14,4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

// the classic "maximize" glyph: corner brackets sitting at the true
// corners, each trailing a short diagonal in toward the center
export function DoubleIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <polyline points="15,3 21,3 21,9" />
      <polyline points="9,21 3,21 3,15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

export function StretchIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <line x1="4" y1="20" x2="20" y2="4" />
      <polyline points="10,4 20,4 20,14" />
      <polyline points="14,20 4,20 4,10" />
    </svg>
  );
}

// the box plus what the drag does to it: the top edge slides one way, the
// bottom the other. The box runs the full icon height; the viewBox is widened
// (not square, unlike the other transform icons) so the arrows flagging each
// edge's direction can sit clear of the box, out at the sides
export function ShearIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg
      width={(size * 42) / 24}
      height={size}
      {...base}
      viewBox="-4 0 42 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M13 2h12l-4 20H9z" />
      <line x1="28" y1="7" x2="36.5" y2="7" />
      <polyline points="32.5,2 36.5,7 32.5,12" />
      <line x1="6" y1="17" x2="-2.5" y2="17" />
      <polyline points="1.5,22 -2.5,17 1.5,12" />
    </svg>
  );
}

// the bent rectangle from the drag preview (both long edges bow the same way,
// the short ends stay anchored), plus an arrow for the drag direction the bulge
// follows
export function BendHIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg
      width={(size * 38) / 24}
      height={size}
      {...base}
      viewBox="0 0 38 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 2c7 7 7 13 0 20" />
      <path d="M18 2c7 7 7 13 0 20" />
      <line x1="4" y1="2" x2="18" y2="2" />
      <line x1="4" y1="22" x2="18" y2="22" />
      <line x1="28" y1="12" x2="36.5" y2="12" />
      <polyline points="32.5,7 36.5,12 32.5,17" />
    </svg>
  );
}

export function BendVIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg
      width={(size * 30) / 24}
      height={(size * 38) / 24}
      {...base}
      viewBox="0 0 30 38"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 4c9 7 17 7 26 0" />
      <path d="M2 18c9 7 17 7 26 0" />
      <line x1="2" y1="4" x2="2" y2="18" />
      <line x1="28" y1="4" x2="28" y2="18" />
      <line x1="15" y1="28" x2="15" y2="36.5" />
      <polyline points="10,32.5 15,36.5 20,32.5" />
    </svg>
  );
}

// the standard undo glyph: back-arrow into a curve that loops ahead
export function RestoreIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <polyline points="9,14 4,9 9,4" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}

// The three Spare glyphs share a page frame at the full extent of the 24-unit
// box, with the mark inside drawn as large as the frame allows. A thin frame
// around a small mark reads lighter than a Flip or Rotate glyph whose strokes
// cross the whole box, which is why these looked smaller than their neighbours
// at the same nominal size — the ink, not the bounds, is what the eye measures.
//
// Every coordinate is a whole unit. With a 2px stroke centred on the path, an
// integer lands the edges on pixel boundaries at 24px and at any whole multiple
// of it; the half-units this started with put vertices mid-pixel and cost the
// glyph its crispness at the one size it is actually drawn at.

// The picture's frame, and the two opposed arrows that mean swap everywhere
// else. The pair reads as a verb where two stacked page outlines would only
// have said "two pages" — and "the other page" is the whole of what the gesture
// does. They keep two clear units between them: drawn any closer the heads meet
// in the middle and the glyph is one dark smudge.
//
// Each arrow is shifted one unit the way it points, which is what centres it in
// the frame — not the two units the shafts' coordinates suggest. A mitred tip
// puts ink about 1.4 units past the vertex it is drawn at (half the stroke over
// sin 45°), so an arrow's ink already reaches further forward than its numbers
// do, and moving it a full two overshoots and crowds the frame.
export function SwapPageIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="22" height="22" />
      <line x1="5" y1="8" x2="18" y2="8" />
      <polyline points="15,5 18,8 15,11" />
      <line x1="19" y1="16" x2="6" y2="16" />
      <polyline points="9,13 6,16 9,19" />
    </svg>
  );
}

// The same page frame as the swap glyph with a one-way arrow: this page's
// contents going to the other one. A family, so the three Spare gadgets read as
// three things done to the same object rather than three unrelated pictures.
export function CopyToSpareIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="22" height="22" />
      <line x1="4" y1="12" x2="18" y2="12" />
      <polyline points="14,7 19,12 14,17" />
    </svg>
  );
}

// The page frame struck through. An X rather than a wastebasket: the bin is a
// desktop metaphor for a file, and this is not a file — nothing goes anywhere,
// the page stops existing.
export function DeletePageIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="22" height="22" />
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

// The merges take two pages rather than one, so they step outside the single
// frame the other three Spare glyphs share: two overlapping pages, and which
// one is in front says which the gesture is.
//
// The overlap is drawn by interrupting the outline of whichever page is behind,
// the way a line drawing has always shown one thing lying over another. Filling
// the front page would have been the easy way and is what most icon sets do,
// but every glyph in this file is an unfilled stroke drawing (see the style
// guide's two registers), and a solid black page next to the Flip and Rotate
// glyphs would read as a different kind of thing entirely.
//
// Both show the *spare* as the page at the top right. In front it is whole and
// crosses over this page; behind, this page is whole and the spare shows as the
// corner still visible past it.
//
// Two alternatives were built and dropped, both for reasons that would recur:
//
//  - Dotting the spare says "the page you cannot see" in one stroke, but a
//    dotted outline cannot occlude anything, and occlusion is the entire cue
//    that separates these two. A heavier dash only fixes that by ceasing to
//    look dotted: square caps extend every dash by a unit at each end, so
//    4-on-2-off renders solid.
//  - One page with the other's material as an arrow running through it, over
//    for front and behind for back, reads well at 10x and fails at 24px. A page
//    big enough to read as a page leaves too little of the box for an arrow
//    whose middle can visibly go missing; shrinking it to 10x14 to make room
//    put the glyph back to looking smaller than its neighbours.
export function MergeFrontIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      {/* this page, its top edge and right side broken where the spare covers */}
      <path d="M10 8 H2 V21 H14 V16" />
      {/* the spare, whole, on top */}
      <rect x="10" y="3" width="12" height="13" />
    </svg>
  );
}

export function MergeBackIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      {/* this page, whole, on top */}
      <rect x="2" y="8" width="12" height="13" />
      {/* the spare behind it: only the corner that clears this page */}
      <path d="M10 8 V3 H22 V16 H14" />
    </svg>
  );
}

// The two overlapping corner marks a photographer's crop L's make. The
// long-standing glyph for the operation, legible in a way a dashed rectangle is
// not. Drawn as two polylines rather than four lines so each corner is one
// mitred joint, matching the other glyphs' joins.
export function CropIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <polyline points="7,2 7,17 22,17" />
      <polyline points="2,7 17,7 17,22" />
    </svg>
  );
}

// The Picture drawer's palette pair. Not transforms, but the same register —
// these sit on the same strip as the Spare gadgets and have to read as their
// siblings do.

// A palette strip with something arriving in it: Use Brush Palette, which
// replaces the picture's palette with the brush's.
export function BrushPaletteIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <rect x="2" y="14" width="20" height="8" />
      <line x1="7" y1="14" x2="7" y2="22" />
      <line x1="12" y1="14" x2="12" y2="22" />
      <line x1="17" y1="14" x2="17" y2="22" />
      <line x1="12" y1="2" x2="12" y2="10" />
      <polyline points="8,6 12,10 16,6" />
    </svg>
  );
}

// The same strip with the arrow turned back out of it: Restore Palette.
export function RestorePaletteIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <rect x="2" y="14" width="20" height="8" />
      <line x1="7" y1="14" x2="7" y2="22" />
      <line x1="12" y1="14" x2="12" y2="22" />
      <line x1="17" y1="14" x2="17" y2="22" />
      <line x1="12" y1="2" x2="12" y2="10" />
      <polyline points="8,6 12,2 16,6" />
    </svg>
  );
}
