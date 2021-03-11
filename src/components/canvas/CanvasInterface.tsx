import { CustomBrush } from '../../brush/CustomBrush';

export interface Canvas {
  fillRect(x: number, y: number, width: number, heigth: number, colorIndex: number): void;
  drawImage(x: number, y: number, brush: CustomBrush): void;
  render(ctx: CanvasRenderingContext2D): void;
}
