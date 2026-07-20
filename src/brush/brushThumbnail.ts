import { CustomBrush } from './CustomBrush';
import { fitLetterboxed } from '../algorithm/thumbnail';

// Renders a brush-slot thumbnail: the brush's matte bitmap (via
// CustomBrush.toImageData, the same pixels a save would write), nearest-
// neighbor scaled into a boxSize square and letterboxed so non-square
// brushes don't distort.
export function renderBrushThumbnail(brush: CustomBrush, boxSize: number): string {
  const imageData = brush.toImageData();
  const target = document.createElement('canvas');
  target.width = boxSize;
  target.height = boxSize;
  const ctx = target.getContext('2d');
  if (!ctx) {
    return '';
  }
  ctx.imageSmoothingEnabled = false;
  const { x, y, width, height } = fitLetterboxed(imageData.width, imageData.height, boxSize);

  if (width >= imageData.width) {
    // Upscale (or 1:1): every source pixel lands on at least one
    // destination pixel, so the canvas's own point-sampled scaling (the
    // blocky look pixelated brushes should have) is correct as-is.
    const source = document.createElement('canvas');
    source.width = imageData.width;
    source.height = imageData.height;
    source.getContext('2d')?.putImageData(imageData, 0, 0);
    ctx.drawImage(source, 0, 0, imageData.width, imageData.height, x, y, width, height);
  } else {
    // Downscale: point-sampled nearest-neighbor can skip a thin line
    // entirely if it falls between sample points, since a whole block of
    // source pixels collapses into one destination pixel. Any-hit
    // downsampling checks every source pixel in that block instead, and
    // keeps the destination pixel opaque if any of them is — a
    // one-pixel-wide line stays visible at full strength no matter how
    // small the brush shrinks to fit the box.
    const destWidth = Math.max(1, Math.round(width));
    const destHeight = Math.max(1, Math.round(height));
    const scaled = downsampleAnyHit(imageData, destWidth, destHeight);
    ctx.putImageData(scaled, Math.round(x), Math.round(y));
  }
  return target.toDataURL('image/png');
}

function downsampleAnyHit(source: ImageData, destWidth: number, destHeight: number): ImageData {
  const dest = new ImageData(destWidth, destHeight);
  const scaleX = source.width / destWidth;
  const scaleY = source.height / destHeight;
  for (let dy = 0; dy < destHeight; dy++) {
    const srcYStart = Math.floor(dy * scaleY);
    const srcYEnd = Math.max(srcYStart + 1, Math.floor((dy + 1) * scaleY));
    for (let dx = 0; dx < destWidth; dx++) {
      const srcXStart = Math.floor(dx * scaleX);
      const srcXEnd = Math.max(srcXStart + 1, Math.floor((dx + 1) * scaleX));
      for (let sy = srcYStart; sy < srcYEnd; sy++) {
        let hit = false;
        for (let sx = srcXStart; sx < srcXEnd; sx++) {
          const si = (sy * source.width + sx) * 4;
          if (source.data[si + 3] > 0) {
            const di = (dy * destWidth + dx) * 4;
            dest.data[di] = source.data[si];
            dest.data[di + 1] = source.data[si + 1];
            dest.data[di + 2] = source.data[si + 2];
            dest.data[di + 3] = source.data[si + 3];
            hit = true;
            break;
          }
        }
        if (hit) {
          break;
        }
      }
    }
  }
  return dest;
}
