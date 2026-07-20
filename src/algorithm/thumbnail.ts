export type LetterboxRect = { x: number; y: number; width: number; height: number };

// Fits a source width/height into a boxSize square, preserving aspect ratio
// and centering the result — the layout math behind brush-slot thumbnails
// (docs/brush-slots.md), kept pure and separate from the canvas drawing that
// uses it (src/brush/brushThumbnail.ts) so it can be tested standalone.
export function fitLetterboxed(
  sourceWidth: number,
  sourceHeight: number,
  boxSize: number
): LetterboxRect {
  const scale = Math.min(boxSize / sourceWidth, boxSize / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (boxSize - width) / 2,
    y: (boxSize - height) / 2,
    width,
    height,
  };
}
