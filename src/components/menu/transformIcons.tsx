import { JSX, useId } from 'react';

// Action glyphs for the drawer gadgets (docs/style-guide.md): line drawings on
// a 24-unit box, currentColor stroke, no fill, square caps and miter joins.
// The disk and brush identity icons are pixel art instead (pixelIcons.tsx).

type IconProps = { size?: number };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
};

// Two arrows away from a dashed mirror axis, exact coordinate reflections of
// each other so the glyph is symmetric by construction.
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

// A right angle with its notch, and a quarter-circle arrow sweeping between the
// legs' ends.
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

// A near-full circle sweeping into its own arrowhead.
export function RotateAnyIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <polyline points="21,3 21,8 16,8" />
    </svg>
  );
}

// Corner brackets pulled toward the centre, each trailing a diagonal out to its
// true corner.
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

// Corner brackets at the true corners, each trailing a diagonal in toward the
// centre.
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

// The box with its top edge slid one way and its bottom the other. The viewBox
// is widened, unlike the others here, so the direction arrows sit clear of it.
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

// The bent rectangle from the drag preview, plus an arrow for the direction the
// bulge follows.
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

// A back-arrow into a curve that loops ahead.
export function RestoreIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <polyline points="9,14 4,9 9,4" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}

// The Spare glyphs share a page frame at the box's full extent, the mark inside
// as large as it allows: a thin frame around a small mark reads lighter than its
// neighbours. Every coordinate is a whole unit, so a 2px stroke lands on pixel
// boundaries at 24px and any multiple of it.

// The page frame with the two opposed arrows that mean swap, kept two units
// apart so the heads do not meet. Each is shifted one unit the way it points,
// not two: a mitred tip already puts ink ~1.4 units past its vertex.
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

// The same frame with a one-way arrow: this page's contents going to the other.
export function CopyToSpareIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="22" height="22" />
      <line x1="4" y1="12" x2="18" y2="12" />
      <polyline points="14,7 19,12 14,17" />
    </svg>
  );
}

// The frame struck through. An X rather than a bin: nothing goes anywhere, the
// page stops existing.
export function DeletePageIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="22" height="22" />
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

// Two overlapping pages, the one in front saying which way the merge goes; the
// spare is the page at the top right in both. The overlap is drawn by
// interrupting the page behind rather than filling the one in front, every glyph
// here being an unfilled stroke drawing.

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

// The two overlapping corner marks a photographer's crop L's make, drawn as two
// polylines so each corner is a single mitred joint.
export function CropIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <polyline points="7,2 7,17 22,17" />
      <polyline points="2,7 17,7 17,22" />
    </svg>
  );
}

// The palette glyphs. Not transforms, but the same register: they share a row
// with the Spare gadgets.

// The strip every palette glyph stands on, defined once so they cannot drift
// apart. Narrower than the box, which is what lets Remap's semicircle reach from
// the first cell's centre to the last.
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

// Wider than the file's usual 24 because the strip needs the room; the height
// matches its siblings, so a row still lines up.
const paletteGlyphBox = (size: number): { viewBox: string; width: number; height: number } => ({
  viewBox: '0 0 40 24',
  width: (size * 40) / 24,
  height: size,
});

// A pencil over the strip: opening the palette editor. A tool rather than an
// arrow, being a way in rather than an operation on the palette.
export function EditPaletteIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg {...base} {...paletteGlyphBox(size)} aria-hidden="true" focusable="false">
      {/* Symmetric by construction: shoulders at (5,-1) and (1,-5) from the
          tip, butt a further (8,-8) from each, so the long edges stay parallel
          however the numbers round. As long as the box allows — the butt corner
          is already a stroke off the top. */}
      <path d="M13 14 L18 13 L26 5 L22 1 L14 9 Z" />
      <line x1="21" y1="10" x2="17" y2="6" />
      <PaletteStrip />
    </svg>
  );
}

// An arrow arriving in the strip: installing a palette. Shared by From Brush and
// Default, which differ only in where the palette comes from.
export function BrushPaletteIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg {...base} {...paletteGlyphBox(size)} aria-hidden="true" focusable="false">
      <line x1="20" y1="2" x2="20" y2="13" />
      <polyline points="16,9 20,13 24,9" />
      <PaletteStrip />
    </svg>
  );
}

// The strip under a revert arrow: putting a palette back is an undo and reads as
// one.
export function RestorePaletteIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg {...base} {...paletteGlyphBox(size)} aria-hidden="true" focusable="false">
      <polyline points="16,3 12,7 16,11" />
      <path d="M12 7h9a3 3 0 0 1 3 3v3" />
      <PaletteStrip />
    </svg>
  );
}

// The Recolor glyphs: a pair of squares, one becoming the other.

// A hollow square becoming a filled one, or the two changing places — one
// drawing with a second head, as LabelArrow is. Wide because three things want
// the width: squares that read as hollow, a gap either side of the arrow, and a
// shaft that survives a second head.
function ColorSwapGlyph({ size, both = false }: { size: number; both?: boolean }): JSX.Element {
  // Hatched rather than solid: solid black beside a hollow outline reads as
  // "empty and full", where these two mean one color and another. Its own id per
  // instance, the glyph rendering more than once on a page.
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

// A color hopping from the first palette slot to the last, which is what
// re-indexing is: an arc within the strip, where an arrow into one would say
// installing a palette, as From Brush and Default do.
//
// A true semicircle, so it meets the strip at a right angle and the head needs
// no tilt. Both ends drop to matching stems stopping two units short of the
// strip: the head hangs below one end, and without the other's stem the shape
// is lopsided.

export function RemapIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg {...base} {...paletteGlyphBox(size)} aria-hidden="true" focusable="false">
      <path d="M11 10 A 9 9 0 0 1 29 10" />
      <line x1="11" y1="10" x2="11" y2="13" />
      <line x1="29" y1="10" x2="29" y2="13" />
      <polyline points="25,9 29,13 33,9" />
      <PaletteStrip />
    </svg>
  );
}

// Two arrows chasing each other round: colors rotating through a range.
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

// An arrow inside a gadget label, drawn rather than typed: Press Start 2P has no
// arrow codepoint, and the fallback faces that do give U+2192 and U+2194
// different weights and baselines. At the file's 2px stroke, which is also the
// pixel font's, so it sits with the letters.
export function LabelArrow({ both = false }: { both?: boolean }): JSX.Element {
  // Wider when it has two heads, so the shaft between them keeps the length it
  // has on the one-headed arrow.
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
