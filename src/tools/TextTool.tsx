import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { FontMetrics } from '../algorithm/glyphRaster';
import { TextFace, metricsOf, outlineRun, runAdvance, textRun } from '../domain/PixelFont';
import { BrushColorIndex } from '../domain/BrushColorIndex';
import { CustomBrush } from '../brush/CustomBrush';
import { DrawTarget } from '../canvas/CanvasController';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { Point } from '../types';

// DPaint's Text tool. Click to set where the text begins, then type: the line
// stays live on the overlay and only reaches the picture when it is finished,
// which is what makes Backspace an edit rather than a second mark. DPaint I
// committed each character as it was typed (TEXT.C, `mDispChar`) and so had to
// erase to the background color to take one back; PyDPainter's `DoText` keeps
// the line editable and stamps it on the way out, which is the model here.
//
// A finished line is stamped as an ordinary brush, so it picks up whatever the
// palette's foreground color is and would pick up a future anti-alias mode the
// same way every other tool does.

const CARET_BLINK_MS = 500;

// A plain copy of the font settings, never the Overmind state object itself.
// The face is a cache key and reaches ctx.font on every keystroke, and reading
// it through Overmind's proxies would pay a get-trap per field per call for
// nothing.
function textFont(): TextFace {
  const font = overmind.state.font;
  if (font.faceId) {
    return { kind: 'bitmap', id: font.faceId, scale: font.scale };
  }
  return {
    kind: 'outline',
    spec: { family: font.family, size: font.size, bold: font.bold, italic: font.italic },
  };
}

// The caret is a box a nominal character wide, as DPaint's was (`InvTxtBox`
// drew one `TxWidth` cell). 'n' stands in for that nominal width, which a
// proportional face does not otherwise have.
const CARET_WIDTH_SAMPLE = 'n';

export class TextTool implements Tool {
  public constructor(filled: boolean) {
    this.filled = filled;
  }
  private filled: boolean;

  private caretVisible = true;
  private blinkTimer: ReturnType<typeof setInterval> | null = null;

  public onInit(): void {
    overmind.actions.tool.textToolReset();
    overmind.actions.tool.activeToolToFGFillStyle();
  }

  // Reached by every way out of the tool: picking another one from the toolbox,
  // and Escape, which GlobalHotkeyManager turns into exactly that.
  public onExit(): void {
    this.commitLine();
    overmind.actions.tool.textToolReset();
  }

  public onContextMenu(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    event.preventDefault();
  }

  public onClick(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    // Clicking while a line is open finishes it, so text can be placed
    // somewhere else without leaving the tool.
    this.commitLine();
    overmind.actions.tool.textToolStart(getMousePos(event));
    this.caretVisible = true;
  }

  // Overlay

  public onInitOverlay(): void {
    document.addEventListener('keydown', this.handleKey);
    this.blinkTimer = setInterval(this.blink, CARET_BLINK_MS);
  }

  public onExitOverlay(): void {
    document.removeEventListener('keydown', this.handleKey);
    if (this.blinkTimer !== null) {
      clearInterval(this.blinkTimer);
      this.blinkTimer = null;
    }
    overlayCanvasController.clear();
  }

  public onClickOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    this.repaint();
  }

  public onMouseMoveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    // Only before a line is open. Once typing has started the pointer is not
    // what the overlay is showing, and following it would wipe the text.
    if (overmind.state.tool.textTool.start) {
      return;
    }
    overlayCanvasController.clear();
    this.drawCaret(getMousePos(event));
  }

  public onMouseLeaveOverlay(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    if (overmind.state.tool.textTool.start) {
      return;
    }
    overlayCanvasController.clear();
  }

  private blink = (): void => {
    if (!overmind.state.tool.textTool.start) {
      return;
    }
    this.caretVisible = !this.caretVisible;
    this.repaint();
  };

  private handleKey = (event: KeyboardEvent): void => {
    if (!overmind.state.tool.textTool.start) {
      return;
    }
    // The font requester is open over the canvas: its controls own the
    // keyboard. This listener is on `document` and outlives the tool's own
    // gadget, so nothing else takes the keys back.
    if (overmind.state.font.settingsOpen) {
      return;
    }
    // Chords belong to the browser and to the undo hotkeys. Escape belongs to
    // GlobalHotkeyManager, which is the keyboard's only way out of this tool.
    if (event.ctrlKey || event.metaKey || event.altKey || event.key === 'Escape') {
      return;
    }

    const metrics = metricsOf(textFont());
    if (event.key === 'Backspace') {
      overmind.actions.tool.textToolBackspace();
    } else if (event.key === 'Enter') {
      this.commitLine();
      overmind.actions.tool.textToolNewLine(metrics.lineHeight);
    } else if (event.key.length === 1) {
      overmind.actions.tool.textToolAppend(event.key);
      this.wrapAtRightEdge(metrics);
    } else {
      return;
    }
    // Reached only for keys the tool consumed. Space would scroll the page
    // otherwise: the menu's own spacebar handler bows out for the text tool
    // (hotkeysSuspended) without preventing the default.
    event.preventDefault();

    this.caretVisible = true;
    this.repaint();
  };

  // DPaint wraps at the right edge of the page and restarts at the line's own
  // left edge. The character that did not fit moves down with the wrap rather
  // than being dropped.
  private wrapAtRightEdge(metrics: FontMetrics): void {
    const { start, text } = overmind.state.tool.textTool;
    if (!start || text === '') {
      return;
    }
    if (start.x + runAdvance(textFont(), text) <= overmind.state.canvas.resolution.width) {
      return;
    }
    const carried = text.slice(-1);
    overmind.actions.tool.textToolBackspace();
    this.commitLine();
    overmind.actions.tool.textToolNewLine(metrics.lineHeight);
    overmind.actions.tool.textToolAppend(carried);
  }

  private commitLine(): void {
    const { start, text } = overmind.state.tool.textTool;
    if (!start || text === '') {
      return;
    }
    this.stampRun(start, text, paintingCanvasController);
    overmind.actions.undo.setUndoPoint();
  }

  private repaint(): void {
    // The overlay does not preserve its drawing buffer, so a repaint from the
    // blink timer composites as a whole fresh frame: everything the overlay
    // should show has to be re-issued here, not just the part that changed.
    overlayCanvasController.beginFrame();
    overlayCanvasController.clear();

    const { start, text } = overmind.state.tool.textTool;
    if (!start) {
      return;
    }
    if (text !== '') {
      this.stampRun(start, text, overlayCanvasController);
    }
    if (this.caretVisible) {
      this.drawCaret({ x: start.x + runAdvance(textFont(), text), y: start.y });
    }
  }

  // `pen` is on the text's baseline, where a click puts it and where each
  // glyph sits: the box is placed around the line, not below it. It is sized
  // from the font's line box rather than from the run, so it neither jumps
  // about as letters without ascenders are typed nor vanishes on an empty line.
  private drawCaret(pen: Point): void {
    const metrics = metricsOf(textFont());
    const top = pen.y - metrics.ascent;
    overlayCanvasController.selectionBox(
      { x: pen.x, y: top },
      {
        x: pen.x + runAdvance(textFont(), CARET_WIDTH_SAMPLE) - 1,
        y: top + metrics.lineHeight - 1,
      }
    );
  }

  // The run is rasterized around its pen position, so the bitmap's own origin
  // has to be taken back off to land the text on the point that was clicked.
  private stampRun(start: Point, text: string, target: DrawTarget): void {
    const rasterized = textRun(textFont(), text);
    const run = this.filled ? rasterized : outlineRun(rasterized);
    if (run.width === 0 || run.height === 0) {
      return;
    }
    const brush = new CustomBrush(
      BrushColorIndex.fromTextRunBits(run.width, run.height, run.bits),
      run.width,
      run.height
    );
    // Always the foreground color, as a built-in brush is: a line of text has
    // no color of its own for Matte or Repl to show.
    brush.setFGColor();
    brush.toFGColor();
    brush.stamp([{ x: start.x - run.originX, y: start.y - run.baseline }], target);
  }
}
