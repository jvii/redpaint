import { Color } from '../../types';

// Draws a pending image into a preview canvas as the chosen treatment would
// load it. What the Load Image and Load Brush requesters do identically. They
// differ only in how a source pixel resolves to a color, which is the callback.
//
// `colorAt` returns the color a pixel becomes, or null to leave it fully
// transparent (a brush's transparent pixels stay so in every mode). No callback
// at all draws the image verbatim: the True Color treatment.
export function drawLoadPreview(
  canvas: HTMLCanvasElement | null,
  image: ImageData | null,
  colorAt?: (data: Uint8ClampedArray, i: number) => Color | null
): void {
  if (!image || !canvas) {
    return;
  }
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  if (!colorAt) {
    ctx.putImageData(image, 0, 0);
    return;
  }
  const out = ctx.createImageData(image.width, image.height);
  for (let i = 0; i < image.data.length; i += 4) {
    const color = colorAt(image.data, i);
    if (!color) {
      continue; // out stays zero-filled, i.e. transparent
    }
    out.data[i] = color.r;
    out.data[i + 1] = color.g;
    out.data[i + 2] = color.b;
    out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
}
