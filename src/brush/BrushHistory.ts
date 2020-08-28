import { Brush } from './Brush';
import { PixelBrush } from './PixelBrush';

class BrushHistory {
  constructor() {
    this.history = [];
    this.current = new PixelBrush();
  }
  history: Brush[];
  current: Brush;

  set(newBrush: Brush): void {
    this.history.push(this.current);
    this.current = newBrush;
  }
}

export const brushHistory = new BrushHistory();
