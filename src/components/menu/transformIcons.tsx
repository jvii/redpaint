import { JSX, useId } from 'react';

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

// The palette strip the three palette glyphs stand on. One geometry, defined
// once: drawn per glyph they drifted into three sizes, and a row of icons that
// each show "a palette" should show the same palette.
//
// Narrower than the 40-unit box, which is what lets Remap's semicircle reach
// from the first cell's centre to the last (see RemapIcon).
function PaletteStrip(): JSX.Element {
  return (
    <>
      <rect x="8" y="17" width="24" height="5" />
      <line x1="14" y1="17" x2="14" y2="22" />
      <line x1="20" y1="17" x2="20" y2="22" />
      <line x1="26" y1="17" x2="26" y2="22" />
    </>
  );
}

// The box these three share. Wider than the file's usual 24 because the strip
// needs the room; the height matches its siblings, so a row still lines up.
const paletteGlyphBox = (size: number): { viewBox: string; width: number; height: number } => ({
  viewBox: '0 0 40 24',
  width: (size * 40) / 24,
  height: size,
});

// A pencil over the strip: opening the palette editor. First of the group, as
// DPaint's Color Control leads with Palette — and the one item there that is a
// way in rather than an operation, which is why it is a tool rather than an
// arrow.
export function EditPaletteIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg {...base} {...paletteGlyphBox(size)} aria-hidden="true" focusable="false">
      {/* tip, shoulders, butt — symmetric about its own 45° axis, so the two
          long edges stay parallel at this size instead of drifting a pixel */}
      <path d="M14 13 L19 12 L26 5 L22 1 L15 8 Z" />
      <line x1="21" y1="10" x2="17" y2="6" />
      <PaletteStrip />
    </svg>
  );
}

// A palette strip with something arriving in it: installing a palette. Shared
// by From Brush and Default, which differ only in where the palette comes from —
// something the glyph does not attempt to say, and the labels do.
export function BrushPaletteIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg {...base} {...paletteGlyphBox(size)} aria-hidden="true" focusable="false">
      <line x1="20" y1="2" x2="20" y2="13" />
      <polyline points="16,9 20,13 24,9" />
      <PaletteStrip />
    </svg>
  );
}

// The strip under the revert arrow the Restore gadget elsewhere uses: putting a
// palette back is an undo, and reads as one. An arrow merely pointing out of
// the strip did not — out of it to where?
export function RestorePaletteIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg {...base} {...paletteGlyphBox(size)} aria-hidden="true" focusable="false">
      <polyline points="16,3 12,7 16,11" />
      <path d="M12 7h9a3 3 0 0 1 3 3v3" />
      <PaletteStrip />
    </svg>
  );
}

// The Brush drawer's Change Color trio. All three say "these pixels become
// those", so all three are built from a pair of brush squares.

// Bg to Fg and its two-headed twin: a hollow square becomes a filled one, or
// the two change places. One drawing with a second head, as LabelArrow is.
//
// Wider than the 24-unit box the rest of this file uses, and by some way. Three
// things compete for the width: squares big enough for the hollow one to read
// as hollow, a gap either side so the arrow does not touch them, and a shaft
// that survives a second head eating into it. At 24 units the arrow is a dash;
// at 36 it is an arrow with nowhere to stand. Solid fill rather than hatching,
// which at this size is all stroke.
function ColorSwapGlyph({ size, both = false }: { size: number; both?: boolean }): JSX.Element {
  // The filled square is hatched rather than solid: solid black next to a
  // hollow outline reads as "empty and full" where these two are "one color and
  // another". Its own id per instance, since the same glyph renders more than
  // once on a page and a shared one would be a duplicate.
  const hatch = `swap-hatch-${useId().replace(/:/g, '')}`;
  return (
    <svg
      {...base}
      viewBox="0 0 40 24"
      width={(size * 40) / 24}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id={hatch}
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="1" y1="0" x2="1" y2="4" stroke="currentColor" strokeWidth="2" />
        </pattern>
      </defs>
      <rect x="1" y="5" width="8" height="14" />
      <line x1="13" y1="12" x2="27" y2="12" />
      <polyline points="23,8 27,12 23,16" />
      {both && <polyline points="17,8 13,12 17,16" />}
      <rect x="31" y="5" width="8" height="14" fill={`url(#${hatch})`} />
    </svg>
  );
}

export function BgToFgIcon({ size = 24 }: IconProps): JSX.Element {
  return <ColorSwapGlyph size={size} />;
}

export function SwapColorsIcon({ size = 24 }: IconProps): JSX.Element {
  return <ColorSwapGlyph size={size} both />;
}

// Remap: a color hopping from the first palette slot to the last, which is what
// re-indexing is. A true semicircle, radius 12 on the strip's own centre line,
// so it meets the strip at a right angle and the head sits on it square — no
// tilt to align, a circle meeting its diameter being vertical there.
//
// The head is the same open V the straight arrows use, and it is separated from
// the curve rather than turned away from it. Rotating cannot work: the arms sit
// 90 degrees apart, so any angle that swings one clear swings the other in —
// counter-clockwise makes a tick, clockwise buries the near arm in the descent.
// A short stem below the arc's end puts the whole head clear of it instead.
//
// The far end gets the same stem, which is what makes the shape symmetric: a
// semicircle's ends are level, but the head hangs below one of them, so without
// a matching drop on the other side one end reached the strip while the other
// floated. Both now stop two units short of it — no arrow here touches what it
// points at, and a square linecap adds half a stroke past the coordinate, which
// is what closed the gap the first time this was tried.
//
// The strip is narrower than the box so the arc's ends land on the first and
// last cell centres: a semicircle wide enough to span a full-width strip needs
// half that width in height, which there is not. The arrow-into-a-strip this started as said only "a palette
// is involved" — and said it in the same words as From Brush and Default, which
// install one. What distinguishes Remap is that nothing is installed: the
// palette stays and the picture's pointers move within it.
export function RemapIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg
      {...base}
      {...paletteGlyphBox(size)}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M11 10 A 9 9 0 0 1 29 10" />
      <line x1="11" y1="10" x2="11" y2="13" />
      <line x1="29" y1="10" x2="29" y2="13" />
      <polyline points="25,9 29,13 33,9" />
      <PaletteStrip />
    </svg>
  );
}


// Two arrows chasing each other round: colors rotating through a range, which
// is the one thing in this group that animates rather than replaces.
export function CycleIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <polyline points="9,2 5,6 9,10" />
      <path d="M5 6h7a6 6 0 0 1 6 6v1" />
      <polyline points="15,22 19,18 15,14" />
      <path d="M19 18h-7a6 6 0 0 1-6-6v-1" />
    </svg>
  );
}

// An arrow to sit inside a gadget label, drawn rather than typed. Press Start
// 2P has no arrow at any codepoint, and the fallback faces that supply one give
// U+2192 and U+2194 different weights, sizes and baselines — so a pair of them
// never matches, however they are scaled or nudged. Drawn here at the same 2px
// stroke as every glyph in this file, which is also the pixel font's stroke, so
// the arrow sits with the letters rather than beside them.
export function LabelArrow({ both = false }: { both?: boolean }): JSX.Element {
  // Wider when it has two heads, so the shaft between them stays the length it
  // is on the one-headed arrow. Sized the other way round — one box for both —
  // the second head eats the shaft and the arrow reads as a squashed X.
  const width = both ? 20 : 16;
  const tip = width - 2;
  return (
    <svg
      className="wb-gadget__arrow"
      width={width}
      height="12"
      viewBox={`0 0 ${width} 12`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="2" y1="6" x2={tip} y2="6" />
      <polyline points={`${tip - 4},2 ${tip},6 ${tip - 4},10`} />
      {both && <polyline points="6,2 2,6 6,10" />}
    </svg>
  );
}

