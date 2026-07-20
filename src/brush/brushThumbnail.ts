import { CustomBrush } from './CustomBrush';
import { fitLetterboxed } from '../algorithm/thumbnail';

// Renders a brush-slot thumbnail: the brush's matte bitmap (via
// CustomBrush.toImageData, the same pixels a save would write), nearest-
// neighbor scaled into a boxSize square and letterboxed so non-square
// brushes don't distort.
export function renderBrushThumbnail(brush: CustomBrush, boxSize: number): string {
  const imageData = brush.toImageData();
  const source = document.createElement('canvas');
  source.width = imageData.width;
  source.height = imageData.height;
  source.getContext('2d')?.putImageData(imageData, 0, 0);

  const target = document.createElement('canvas');
  target.width = boxSize;
  target.height = boxSize;
  const ctx = target.getContext('2d');
  if (!ctx) {
    return '';
  }
  ctx.imageSmoothingEnabled = false;
  const { x, y, width, height } = fitLetterboxed(imageData.width, imageData.height, boxSize);
  ctx.drawImage(source, 0, 0, imageData.width, imageData.height, x, y, width, height);
  return target.toDataURL('image/png');
}
