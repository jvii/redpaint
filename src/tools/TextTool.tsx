import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';

export class TextTool implements Tool {
  public constructor(filled: boolean) {
    this.filled = filled;
  }
  private filled: boolean;

  public onInit(): void {
    //selection.prepare(canvas);
    overmind.actions.tool.textToolReset();
    overmind.actions.tool.activeToolToFGFillStyle();
  }

  public onExit(): void {
    const start = overmind.state.tool.textTool.start;
    const text = overmind.state.tool.textTool.text;
    if (start && text !== '') {
      //this.renderText(ctx);
      //undoPoint();
    }
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onClick(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const mousePos = getMousePos(event);

    const start = overmind.state.tool.textTool.start;
    const text = overmind.state.tool.textTool.text;
    if (start && text !== '') {
      //this.renderText(ctx);
      //undoPoint();
      this.onInit();
    }
    overmind.actions.tool.textToolStart(mousePos);
  }

  // Overlay

  public onInitOverlay(): void {
    window.onkeydown = (event: KeyboardEvent): void => {
      overmind.actions.tool.textToolKey(event.key);
      //clearOverlayCanvas(canvas);
      //this.renderText(ctx);
      //selection.textCursor(ctx, 50);
    };
    //clearOverlayCanvas(canvas);
  }

  public onExitOverlay(): void {
    //clearOverlayCanvas(canvas);
  }

  public onClickOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    //clearOverlayCanvas(canvas);
    //selection.textCursor(ctx, 50);
  }

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const start = overmind.state.tool.textTool.start;
    if (!start) {
      //clearOverlayCanvas(canvas);
      const mousePos = getMousePos(event);
      //selection.box(ctx, mousePos, { x: mousePos.x + 20, y: mousePos.y - 50 });
    }
  }

  public onMouseEnterOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    //clearOverlayCanvas(canvas);
    //this.renderText(ctx);
    //selection.textCursor(ctx, 50);
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    //clearOverlayCanvas(canvas);
    //this.renderText(ctx);
    //selection.textCursor(ctx, 50);
  }

  private renderText(ctx: CanvasRenderingContext2D): void {
    ctx.font = '50px Georgia';
    const start = overmind.state.tool.textTool.start;
    if (!start) {
      return;
    }
    const text = overmind.state.tool.textTool.text;
    if (this.filled) {
      ctx.fillText(text, start.x, start.y);
    } else {
      ctx.strokeText(text, start.x, start.y);
    }
  }
}
