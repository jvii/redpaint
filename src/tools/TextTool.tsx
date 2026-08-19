import { Tool } from './Tool';
import { getMousePos } from './util/util';
import { overmind } from '../index';
import { FontMetrics, FontSpec, TextRun } from '../algorithm/glyphRaster';
import {
  faceKey,
  metricsOf,
  OUTLINE_ROOM,
  lineAdvance,
  outlineRun,
  runAdvance,
  textRun,
  underlineRun,
} from '../domain/PixelFont';
import { BrushColorIndex } from '../domain/BrushColorIndex';
import { CustomBrush } from '../brush/CustomBrush';
import { DrawTarget } from '../canvas/CanvasController';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { Point } from '../types';

// DPaint's Text tool. Click to set where the text begins, then type: the line
// stays live on the overlay and only reaches the picture when it is finished,
// which is what makes Backspace an edit rather than a second mark.
//
// A finished line is stamped as an ordinary brush, but through drawImage rather
// than CustomBrush.stamp, so the paint modes do not reach it. See
// docs/text-tool.md.

const CARET_BLINK_MS = 500;

// A plain copy, never the Overmind state object: this reaches ctx.font on every
// keystroke and would pay a proxy get-trap per field per call.
function textFont(): FontSpec {
  const font = overmind.state.font;
  return { family: font.family, size: font.size, bold: font.bold, italic: font.italic };
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
  // The line's brush, rebuilt only when the line, face or color changes. See
  // brushFor.
  private cachedStamp: { key: string; brush: CustomBrush; run: TextRun } | null = null;

  // No reset here: the caret survives a change of tool on purpose (see onExit),
  // and the click that places text is what starts a fresh line.
  public onInit(): void {
    overmind.actions.tool.activeToolToFGFillStyle();
  }

  // The caret is left where the committed line ended: the gadget's two halves
  // are separate tools, so changing fill style mid-line comes through here and
  // should continue the line rather than lose the place.
  public onExit(): void {
    this.commitLine();
    // A finished line's brush is worth nothing to the next one, and the biggest
    // are megabytes.
    this.cachedStamp = null;
  }

  // A live line re-renders from current state on every repaint, so it would
  // otherwise change face, size or color along its whole length. The caret
  // stays at the end, and typing carries on in the new setting.
  public commitPending(): void {
    this.commitLine();
    // The requester opens through here; the caret has to be off the overlay
    // before it does.
    this.repaint();
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
      overmind.actions.tool.textToolNewLine(lineAdvance(textFont()));
    } else if (event.key.length === 1) {
      overmind.actions.tool.textToolAppend(event.key);
      this.placeTypedCharacter(metrics);
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

  // Decides where the character just typed can go. It stays where it is if the
  // line still fits, wraps to a new line as DPaint's does, or — when the page
  // has no room left for it anywhere — is taken back.
  //
  // Taking it back is the important case. A big font on a small page runs out
  // of room within a couple of words, and anything placed past the edge is
  // committed where it cannot be seen, taking the caret with it: you keep
  // typing, nothing appears, the cursor is gone, and the tool reads as broken.
  // Refusing the character instead leaves the last line on screen and the caret
  // blinking at the end of it, which says "full" rather than "dead". Nothing is
  // lost that was ever visible, and Backspace still works.
  //
  // DPaint's own answer was to scroll the page under the text; redpaint does
  // not scroll, so the page really is the limit.
  private placeTypedCharacter(metrics: FontMetrics): void {
    const { start, lineStart, text } = overmind.state.tool.textTool;
    if (!start || !lineStart || text === '') {
      return;
    }
    const { width: pageWidth, height: pageHeight } = overmind.state.canvas.resolution;
    if (start.x + runAdvance(textFont(), text, this.tracking()) <= pageWidth) {
      return; // still fits on this line
    }

    // The whole next line has to fit, not just its top: one wrapped to where
    // only its ascenders show is not somewhere anyone wanted the text. And a
    // column too narrow for even a single character gains nothing by wrapping —
    // it would spend a line per keystroke walking down the page.
    const carried = text.slice(-1);
    const nextBaselineY = start.y + lineAdvance(textFont());
    const roomBelow = nextBaselineY + metrics.descent <= pageHeight;
    const roomOnANewLine =
      lineStart.x + runAdvance(textFont(), carried, this.tracking()) <= pageWidth;
    if (!roomBelow || !roomOnANewLine) {
      overmind.actions.tool.textToolBackspace();
      return;
    }

    overmind.actions.tool.textToolBackspace();
    this.commitLine();
    overmind.actions.tool.textToolNewLine(lineAdvance(textFont()));
    overmind.actions.tool.textToolAppend(carried);
  }

  private commitLine(): void {
    const { start, text } = overmind.state.tool.textTool;
    if (!start || text === '') {
      return;
    }
    this.stampRun(start, text, paintingCanvasController);
    overmind.actions.undo.setUndoPoint();
    // Measured with the font the line was typed in, which is still the current
    // one: every caller commits before changing anything.
    overmind.actions.tool.textToolCommitted(runAdvance(textFont(), text, this.tracking()));
  }

  private repaint(): void {
    // preserveDrawingBuffer: false — a blink-timer repaint composites a whole
    // fresh frame, so everything the overlay shows is re-issued here.
    overlayCanvasController.beginFrame();
    overlayCanvasController.clear();

    const { start, text } = overmind.state.tool.textTool;
    if (!start) {
      return;
    }
    if (text !== '') {
      this.stampRun(start, text, overlayCanvasController);
    }
    // Not behind the font requester, whose controls own the keyboard. The
    // position is kept, so it returns on the same character.
    if (this.caretVisible && !overmind.state.font.settingsOpen) {
      this.drawCaret({ x: start.x + runAdvance(textFont(), text, this.tracking()), y: start.y });
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
        x: pen.x + runAdvance(textFont(), CARET_WIDTH_SAMPLE, this.tracking()) - 1,
        y: top + metrics.lineHeight - 1,
      }
    );
  }

  // The run is rasterized around its pen position, so the bitmap's own origin
  // has to be taken back off to land the text on the point that was clicked.
  private stampRun(start: Point, text: string, target: DrawTarget): void {
    const stamp = this.brushFor(text);
    if (!stamp) {
      return;
    }
    // drawImage, not CustomBrush.stamp: stamp routes the effect modes through
    // effectDraw, and text takes no mode.
    target.drawImage(
      [{ x: start.x - stamp.run.originX, y: start.y - stamp.run.baseline }],
      stamp.brush
    );
  }

  // The brush for a line, kept until the line changes.
  //
  // The run itself is already memoized (PixelFont), but everything built on top
  // of it was not: a BrushColorIndex, a CustomBrush and its colorized copy were
  // rebuilt on every repaint — and since each was a new instance with a new
  // `lastChanged`, the renderer re-uploaded its texture too. The caret's blink
  // repaints twice a second, so a line nobody had touched was costing that
  // rebuild and a full texture upload every 500ms (~3ms and ~460KB for a
  // full-width 128px line). Keystrokes pay it once, as they must.
  //
  // The foreground color is in the key because setFGColor bakes it into the
  // bitmap. Only its identity, not the displayed color: an indexed brush stores
  // the palette index and cycling is resolved in the shader, so a cycling
  // palette does not stale this.
  // Room for the ring outlineRun draws outside each letter.
  private tracking(): number {
    return this.filled ? 0 : OUTLINE_ROOM;
  }

  private brushFor(text: string): { brush: CustomBrush; run: TextRun } | null {
    const spec = textFont();
    const underline = overmind.state.font.underline;
    const key =
      `${faceKey(spec)}|${this.filled ? 'f' : 'o'}|${underline ? 'u' : ''}` +
      `|${foregroundKey()}|${text}`;
    if (this.cachedStamp?.key === key) {
      return this.cachedStamp;
    }

    // Underline first, so with both on the rule is outlined along with the
    // letters — which is what two independent toggles should give.
    const rasterized = textRun(spec, text, this.tracking());
    const underlined = underline
      ? underlineRun(rasterized, runAdvance(spec, text, this.tracking()), spec.size)
      : rasterized;
    const run = this.filled ? underlined : outlineRun(underlined);
    if (run.width === 0 || run.height === 0) {
      this.cachedStamp = null;
      return null;
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

    this.cachedStamp = { key, brush, run };
    return this.cachedStamp;
  }
}

function foregroundKey(): string {
  const color = overmind.state.palette.foregroundPaintColor;
  return color.kind === 'index'
    ? `i${color.colorNumber}`
    : `r${color.color.r},${color.color.g},${color.color.b}`;
}
