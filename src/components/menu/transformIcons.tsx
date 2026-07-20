import { JSX } from 'react';

// Action glyphs for the drawer's transform gadgets (see
// docs/style-guide.md): single-color line drawings, 24x24 viewBox,
// currentColor stroke, no fill, so they scale smoothly and inherit the
// gadget's hover/disabled/pressed color. Square caps and miter joins, not
// rounded — the crisp line-ends read like a sharp 1-bit drawing at native
// resolution, which is what period toolbar glyphs actually were; rounded
// caps are the modern-web tell. The disk and brush identity icons stay
// pixel art (pixelIcons.tsx).

type IconProps = { size?: number };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
};

// two standard arrows pointing away from a dashed mirror axis — exact
// coordinate reflections of each other, so the glyph is symmetric by
// construction, and the arrow style matches the other transform icons
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
// bottom the other — the box runs the full icon height; the viewBox is
// widened (not square, unlike the other transform icons) so the arrows
// flagging each edge's direction can sit clear of the box, out at the sides
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

// the bent rectangle from the drag preview — both long edges bow the same
// way, the short ends stay anchored — plus an arrow for the drag direction
// the bulge follows
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
