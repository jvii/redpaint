import { JSX } from 'react';

// The empty brush-slot's glyph: a standard download-into-tray arrow, in the
// same line-drawing language as transformIcons.tsx (24x24, currentColor
// stroke, square caps/miter joins, no fill) — this is an action glyph
// (store), not an identity icon, so it stays a line drawing rather than
// pixel art per docs/style-guide.md.
export function StoreIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="12" y1="3" x2="12" y2="14" />
      <polyline points="7,9 12,14 17,9" />
      <path d="M4 17v3h16v-3" />
    </svg>
  );
}
