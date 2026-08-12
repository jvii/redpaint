import { JSX } from 'react';

// Action glyphs for the Fill Style dialog's gradient-axis toggle (see
// docs/style-guide.md's Icons section): the axis names shown as arrows instead
// of text, DPaint-style. Same register as transformIcons.tsx: single-color line
// drawings, 24x24 viewBox, currentColor stroke, no fill, so they inherit the
// toggle segment's hover/selected/disabled color. Vertical/Horizontal use the
// shared square-cap/miter style so their arrowheads read as crisp triangles;
// Horizontal Line intentionally swaps in round caps/joins for its curved
// arrowheads, since a rounded head (rather than a sharp one) is the thing that
// sets this axis apart from plain Horizontal.
type IconProps = { size?: number };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
};

export function GradientVerticalIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      {...base}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="12" y1="3" x2="12" y2="21" />
      <polyline points="8,7 12,3 16,7" />
      <polyline points="8,17 12,21 16,17" />
    </svg>
  );
}

export function GradientHorizontalIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      {...base}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <polyline points="7,8 3,12 7,16" />
      <polyline points="17,8 21,12 17,16" />
    </svg>
  );
}

export function GradientHorizontalLineIcon({ size = 24 }: IconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      {...base}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      {/* each head is two quadratic curves sharing their end point (the
          stem's own x=3/x=21 endpoint), so the curve actually bulges — a
          straight polyline with round joins barely reads as rounded at this
          stroke width, since the join radius is only ~1px */}
      <path d="M8,7 Q3,9.5 3,12 Q3,14.5 8,17" />
      <path d="M16,7 Q21,9.5 21,12 Q21,14.5 16,17" />
    </svg>
  );
}
