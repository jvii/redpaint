// The cursor readout is written straight into the DOM, not through Overmind:
// it changes on every mousemove, and routing that through state would
// re-render the menu bar per pixel. Canvas.tsx's own cursor takes the same
// route for the same reason.
//
// The menu bar registers its two value nodes; nothing happens until it does,
// so the setting being off costs a null check.
let xNode: HTMLElement | null = null;
let yNode: HTMLElement | null = null;

export function registerCoordsNodes(x: HTMLElement | null, y: HTMLElement | null): void {
  xNode = x;
  yNode = y;
}

export function showCoords(x: number, y: number): void {
  if (xNode && yNode) {
    xNode.textContent = String(x);
    yNode.textContent = String(y);
  }
}

// Off the canvas there is no pixel under the cursor. The slot keeps its width
// (Menubar.css) so nothing beside it moves.
export function clearCoords(): void {
  if (xNode && yNode) {
    xNode.textContent = '';
    yNode.textContent = '';
  }
}
