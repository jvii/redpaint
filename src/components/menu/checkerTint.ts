import { CSSProperties } from 'react';
import { Color } from '../../types';

// The shared transparency checker (index.css) drawn in two shades of a color
// instead of its neutral greys, by overriding the two custom properties it is
// built from. No second pattern and no new rule — the same class, re-tinted.
//
// For a brush slot that color is the background: a brush's transparent pixels
// are exactly the ones the background shows through, so the thumbnail reads
// the way the stamp will, and a thin dark line stops competing with a grey
// check for attention. The pattern stays on top of it because a brush can also
// *contain* the background color, and against a flat fill a hole and a painted
// pixel of the same color would be one shape.
//
// The fill style swatch (FillStyleSettings.css) reached the same ground from
// the other side: it dropped the checker for a flat background color, because
// nearly all of what it checkered was the margin around the ellipse. Both
// preview against the color they will be painted on; only this one has
// per-pixel transparency worth marking, so only this one keeps the pattern.
//
// Elsewhere (the load preview, the menubar fill box) the checker stands for
// "nothing here" rather than "the background", and neutral greys are right.
export function checkerTint(color: Color): CSSProperties {
  // The neutral pair is #e8e8e8 against #cfcfcf, about a ninth apart. Matching
  // that, shifted away from whichever end the color sits at so the pattern
  // survives on black as readably as on white.
  const luminance = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
  const toward = luminance > 128 ? 0 : 255;
  const shaded = (channel: number): number => Math.round(channel + (toward - channel) * 0.14);
  return {
    '--checker-light': `rgb(${color.r}, ${color.g}, ${color.b})`,
    '--checker-dark': `rgb(${shaded(color.r)}, ${shaded(color.g)}, ${shaded(color.b)})`,
  } as CSSProperties;
}
