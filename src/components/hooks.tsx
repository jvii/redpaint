type Point = {x:number, y:number}

export function useTool(isMouseDown: Boolean, previousPosition: Point | null, currentPosition: Point | null, canvas: HTMLCanvasElement) {
    if (!isMouseDown) {
        return;
      }
      if (!previousPosition) {
        return;
      }
      if (!currentPosition) {
        return;
      }
      paint(canvas, previousPosition!, currentPosition!);
}

function paint(canvas: HTMLCanvasElement, previousPos: Point, currentPos: Point) {
    const ctx  = canvas.getContext('2d')!
    ctx.beginPath();
    ctx.moveTo(previousPos.x, previousPos.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();
  }