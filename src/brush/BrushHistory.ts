import { BrushInterface } from './Brush';
import { PixelBrush } from './PixelBrush';

class BrushHistory {
  constructor() {
    this.history = [];
    this.current = new PixelBrush();
  }
  history: BrushInterface[];
  current: BrushInterface;

  set(newBrush: BrushInterface): void {
    this.history.push(this.current);
    this.current = newBrush;
  }
}

export const brushHistory = new BrushHistory();
