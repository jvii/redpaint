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
      <line x1="9" y1="12" x2="4" y2="12" />
      <polyline points="7,9 4,12 7,15" />
      <line x1="15" y1="12" x2="20" y2="12" />
      <polyline points="17,9 20,12 17,15" />
    </svg>
  );
}

export function FlipVIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="3 3" />
      <line x1="12" y1="9" x2="12" y2="4" />
      <polyline points="9,7 12,4 15,7" />
      <line x1="12" y1="15" x2="12" y2="20" />
      <polyline points="9,17 12,20 15,17" />
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
// bottom the other
export function ShearIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <path d="M10 8h10l-4 8H6z" />
      <line x1="6" y1="4" x2="14" y2="4" />
      <polyline points="12,1.5 14.5,4 12,6.5" />
      <line x1="18" y1="20" x2="10" y2="20" />
      <polyline points="12,17.5 9.5,20 12,22.5" />
    </svg>
  );
}

// the bent rectangle from the drag preview — both long edges bow the same
// way, the short ends stay anchored — plus an arrow for the drag direction
// the bulge follows
export function BendHIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <path d="M3 3c4 6 4 12 0 18" />
      <path d="M12 3c4 6 4 12 0 18" />
      <line x1="3" y1="3" x2="12" y2="3" />
      <line x1="3" y1="21" x2="12" y2="21" />
      <line x1="16.5" y1="12" x2="21" y2="12" />
      <polyline points="18.5,8.5 22,12 18.5,15.5" />
    </svg>
  );
}

export function BendVIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} {...base} aria-hidden="true" focusable="false">
      <path d="M3 3c6 4 12 4 18 0" />
      <path d="M3 12c6 4 12 4 18 0" />
      <line x1="3" y1="3" x2="3" y2="12" />
      <line x1="21" y1="3" x2="21" y2="12" />
      <line x1="12" y1="16.5" x2="12" y2="21" />
      <polyline points="8.5,18.5 12,22 15.5,18.5" />
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
