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
  const image = new Image();
  const objectURL = URL.createObjectURL(blob);
  image.onload = (): void => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
  };
  image.src = objectURL;
}
