import { clearCanvas, colorToRGBString } from '../../tools/util';
import { overmind } from '../../index';
import { CustomBrush } from '../../brush/CustomBrush';

export function cloneCanvas(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement
): void {
  const targetContext = targetCanvas.getContext('2d');
  if (targetContext) {
    targetContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    targetContext.drawImage(sourceCanvas, 0, 0);
  }
}

export function blobToCanvas(blob: Blob | null, canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d');
  if (context === null) {
    return;
  }
  if (blob === null) {
    return;
  }
  clearCanvas(canvas, { r: 255, g: 255, b: 255 });
  const image = new Image();
  image.onload = function(): void {
    context.drawImage(image, 0, 0);
  };
  image.src = URL.createObjectURL(blob);
}
