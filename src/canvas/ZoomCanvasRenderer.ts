import { overmind } from '..';
import { Throttle } from '../tools/util/Throttle';

export class ZoomCanvasRenderer {
  private zoomCanvas: HTMLCanvasElement;
  private zoomCanvasCtx: CanvasRenderingContext2D;
  private throttle = new Throttle(1000 / 60);

  constructor(zoomCanvas: HTMLCanvasElement) {
    this.zoomCanvas = zoomCanvas;
    const ctx = zoomCanvas.getContext('2d', {
      alpha: true,
      // desynchronized caused various problems with Windows version of Chrome
      // TODO: test again with the new version
      desynchronized: true,
    });
    if (!ctx) {
      throw 'Could not get 2d context for ZoomCanvas';
    }
    this.zoomCanvasCtx = ctx;
  }

  render(mainCanvas: HTMLCanvasElement): void {
    if (!overmind.state.toolbox.zoomModeOn) {
      return;
    }
    this.zoomCanvasCtx?.clearRect(0, 0, this.zoomCanvas.width, this.zoomCanvas.height);
    this.zoomCanvasCtx?.drawImage(mainCanvas, 0, 0);

    /* // throttle copying to zoomCanvas when drawing on mainCanvas
    // This an optimization for Firefox where copying from gl canvas to 2d canvas is slow
    this.throttle.call((): void => {
      this.zoomCanvasCtx?.clearRect(0, 0, this.zoomCanvas.width, this.zoomCanvas.height);
      this.zoomCanvasCtx?.drawImage(mainCanvas, 0, 0);
    }); */
  }

  clear(): void {
    this.zoomCanvasCtx?.clearRect(0, 0, this.zoomCanvas.width, this.zoomCanvas.height);
  }
}
