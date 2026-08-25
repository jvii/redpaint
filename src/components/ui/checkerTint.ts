import { CSSProperties } from 'react';
import { Color } from '../../types';

// Tints the shared transparency checker (index.css) by overriding the two
// custom properties it is built from, rather than adding a second pattern.
//
// For brushes only: a brush's transparent pixels are the ones this ground
// shows through, so the preview reads the way the stamp will. Previews of a
// whole picture keep the neutral greys — their transparency is not a hole.
export function checkerTint(color: Color): CSSProperties {
  // The neutral pair sits about a ninth apart. Matched here, and shifted away
  // from whichever end the color is at so the check survives on black as
  // readably as on white.
  const luminance = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
  const toward = luminance > 128 ? 0 : 255;
  const shaded = (channel: number): number => Math.round(channel + (toward - channel) * 0.14);
  return {
    '--checker-light': `rgb(${color.r}, ${color.g}, ${color.b})`,
    '--checker-dark': `rgb(${shaded(color.r)}, ${shaded(color.g)}, ${shaded(color.b)})`,
  } as CSSProperties;
}
