import { overmind } from '../..';
import { CustomBrush } from '../../brush/CustomBrush';
import { Line, PaintColor, Point } from '../../types';
import { CanvasController } from '../CanvasController';
import { ZoomCanvasRenderer } from '../ZoomCanvasRenderer';
import { shiftPoint } from '../util/util';
import { OverlayMainCanvasRenderer } from './OverlayMainCanvasRenderer';
import { createPaletteTexture, uploadPaletteTexture } from '../util/paletteTexture';
import { GradientFillStyle } from '../../algorithm/gradientFill';
import { FillShape } from '../../algorithm/fillShape';
import { BrushColorIndex } from '../../domain/BrushColorIndex';

// OverlayController is a singleton responsible for controlling
// the two overlay canvases in the app for MainCanvas and ZoomCanvas.
class OverlayCanvasController implements CanvasController {
  private mainCanvasOverlay: HTMLCanvasElement = document.createElement('canvas');
  private gl: WebGLRenderingContext | null = null;

  private mainCanvasRenderer: OverlayMainCanvasRenderer | null = null;
  private zoomCanvasRenderer: ZoomCanvasRenderer | null = null;

  private buffers: { vertexBuffer: WebGLBuffer | null; textureCoordBuffer: WebGLBuffer | null } = {
    vertexBuffer: null,
    textureCoordBuffer: null,
  };

  // The overlay has preserveDrawingBuffer: false, so any draw made outside the
  // original mouse event's synchronous run (CycleDriver's rAF tick) composites
  // as a fresh frame and anything not re-issued is genuinely absent, not stale.
  // So every overlay draw since the last beginFrame() is remembered — not just
  // the color-bearing ones — and CycleDriver replays the whole frame: replaying
  // only the color-dependent calls would erase whatever was drawn alongside
  // them, and a symmetry preview issues one call per copy plus the cursor and
  // indicator dots. Canvas.tsx calls beginFrame() before each overlay handler,
  // so one event's calls accumulate and the next event starts a fresh list.
  // actually persistent: any draw call made outside the original mouse
  // event's synchronous run (e.g. from CycleDriver's rAF tick) composites as
  // its own fresh frame, and anything not re-issued as part of *that* call
  // sequence is gone — not just stale, genuinely absent from what's on
  // screen. So a palette rotation doesn't show up on whatever's currently
  // displayed until the next mouse move redraws it, and replaying only the
  // color-bearing draws (to pick up the new palette) would erase anything
  // drawn alongside them that didn't get replayed too — e.g. the Circle
  // tool's edge-to-edge selectionCrosshair, drawn in the same mouse event as
  // the symmetry-indicator dots but not itself color-dependent, would
  // vanish the moment cycling's replay redrew just the dots. So this
  // remembers *every* overlay draw call made since the last
  // beginFrame()/clear() — color-bearing or not — and CycleDriver replays
  // the whole frame every tick. Solid-color and gradient-filled shape
  // previews are each a single call, but a symmetry-mode preview issues one
  // per copy, plus separate calls for the brush cursor/indicator dots
  // alongside it; all of them need replaying, not just the last, or every
  // copy/indicator but one would freeze or vanish. Canvas.tsx calls
  // beginFrame() before dispatching each overlay handler, so calls from a
  // single mouse event accumulate together and calls from the next event
  // start a fresh list instead of growing forever.
  private frameDraws: Array<() => void> = [];
  // Guards against redrawForCycling()'s replay re-recording itself into
  // frameDraws (each draw method records unconditionally otherwise).
  private replayingForCycling = false;

  // Whether the last composited overlay frame shows anything. The composited
  // frame outlives the (preserveDrawingBuffer: false) buffer, so "is there
  // something on screen" can't be asked of GL — tracked here instead, set by
  // every draw (replayed ones included) and cleared by clear(). The DOM
  // hover preview (hoverBrushPreview.ts) uses it to clear a stale canvas
  // stamp exactly once when it takes over, not on every mousemove.
  private contentOnScreen = false;

  hasContentOnScreen(): boolean {
    return this.contentOnScreen;
  }

  private recordFrameDraw(replay: () => void): void {
    this.contentOnScreen = true;
    if (!this.replayingForCycling) {
      this.frameDraws.push(replay);
    }
  }

  // Called by Canvas.tsx right before dispatching each *Overlay tool
  // handler, so the draws that handler makes are grouped as one replayable
  // "frame" instead of accumulating forever across every mouse event.
  beginFrame(): void {
    this.frameDraws = [];
  }

  attachMainCanvas(mainCanvasOverlay: HTMLCanvasElement): void {
    this.mainCanvasOverlay = mainCanvasOverlay;

    const gl = mainCanvasOverlay.getContext('webgl', {
      preserveDrawingBuffer: false,
      antialias: false,
    });
    if (!gl) {
      throw new Error('No WebGL context available');
    }
    this.gl = gl;

    this.buffers.vertexBuffer = this.initVertexBuffer();
    this.buffers.textureCoordBuffer = this.initTextureCoordBuffer();
    this.initPaletteTexture();

    this.mainCanvasRenderer = new OverlayMainCanvasRenderer(gl, {
      vertexBuffer: this.buffers.vertexBuffer,
      textureCoordBuffer: this.buffers.textureCoordBuffer,
    });
  }

  attachZoomCanvas(zoomCanvasOverlay: HTMLCanvasElement): void {
    this.zoomCanvasRenderer = new ZoomCanvasRenderer(zoomCanvasOverlay);
  }

  points(points: Point[], color: PaintColor): void {
    this.recordFrameDraw(() => this.points(points, color));
    this.mainCanvasRenderer?.points(points, color);
    this.renderZoomCanvas();
  }

  lines(lines: Line[], color: PaintColor): void {
    this.recordFrameDraw(() => this.lines(lines, color));
    this.mainCanvasRenderer?.lines(lines, color);
    this.renderZoomCanvas();
  }

  quad(start: Point, end: Point, color: PaintColor): void {
    this.recordFrameDraw(() => this.quad(start, end, color));
    this.mainCanvasRenderer?.quad(start, end, color);
    this.renderZoomCanvas();
  }

  gradientFill(shape: FillShape, style: GradientFillStyle, seed: number): void {
    this.recordFrameDraw(() => this.gradientFill(shape, style, seed));
    this.mainCanvasRenderer?.gradientFill(shape, style, seed);
    this.renderZoomCanvas();
  }

  patternFill(shape: FillShape, pattern: BrushColorIndex, version: number): void {
    this.recordFrameDraw(() => this.patternFill(shape, pattern, version));
    this.mainCanvasRenderer?.patternFill(shape, pattern, version);
    this.renderZoomCanvas();
  }

  drawImage(points: Point[], brush: CustomBrush): void {
    this.recordFrameDraw(() => this.drawImage(points, brush));
    this.mainCanvasRenderer?.drawImage(points, brush);
    this.renderZoomCanvas();
  }

  effectDraw(points: Point[], brush: CustomBrush, copyId: number): void {
    // effects cannot be previewed without applying them; show the brush
    // shape as the cursor, like DPaint did. Re-derive EffectIndexer's own
    // stamp origin (see EffectIndexer.effectDraw) rather than feeding points
    // straight to drawImage's quad math, which assumes CustomBrush's
    // adjustHandle centering - PixelBrush's effect-mode stamp calls this
    // with raw, uncentered cursor points, so without this the preview quad
    // lands half a pixel off and rounds into the wrong cell.
    const origins = points.map((point) => {
      const shifted = shiftPoint(point);
      const origin = { x: Math.round(shifted.x) - 1, y: Math.round(shifted.y) - 1 };
      return { x: origin.x - 0.5, y: origin.y - 0.5 };
    });
    this.drawImage(origins, brush);
  }

  // The overlay's effectDraw already renders eagerly (via drawImage above) —
  // it's just showing the brush cursor, never batched across symmetry
  // copies the way the committed painting canvas is. Nothing to flush.
  flushEffectDraw(): void {
    // no-op
  }

  endEffectStroke(): void {
    // overlay holds no committed pixels, nothing to end
  }

  selectionBox(start: Point, end: Point): void {
    this.recordFrameDraw(() => this.selectionBox(start, end));
    this.mainCanvasRenderer?.selectionBox(start, end);
    this.renderZoomCanvas();
  }

  selectionCrosshair(point: Point): void {
    this.recordFrameDraw(() => this.selectionCrosshair(point));
    this.mainCanvasRenderer?.selectionCrosshair(point);
    this.renderZoomCanvas();
  }

  selectionPolygon(points: Point[]): void {
    this.recordFrameDraw(() => this.selectionPolygon(points));
    this.mainCanvasRenderer?.selectionPolygon(points);
    this.renderZoomCanvas();
  }

  // Copying the overlay into the zoom view costs a full-canvas blit per draw
  // call, so skip it while the zoom view is hidden.
  private renderZoomCanvas(): void {
    if (overmind.state.toolbox.zoomModeOn) {
      this.zoomCanvasRenderer?.render(this.mainCanvasOverlay);
    }
  }
  clear(): void {
    this.contentOnScreen = false;
    this.frameDraws = [];
    this.mainCanvasRenderer?.clear();
    this.zoomCanvasRenderer?.clear();
  }

  // Called by CycleDriver after updatePalette() re-uploads the rotated
  // texture: replays every draw from the current frame (a brush cursor, an
  // in-progress shape, a selection crosshair — possibly several calls, e.g.
  // one per gradient-fill color band) so color-bearing content animates
  // along with the canvas and everything else stays on screen instead of
  // being dropped by the partial redraw (see the frameDraws comment above).
  // A no-op when the overlay is empty.
  redrawForCycling(): void {
    if (this.frameDraws.length === 0) {
      return;
    }
    this.replayingForCycling = true;
    try {
      for (const draw of this.frameDraws) {
        draw();
      }
    } finally {
      this.replayingForCycling = false;
    }
  }

  updatePalette(): void {
    const gl = this.gl;
    if (!gl) {
      throw new Error('No webgl');
    }

    uploadPaletteTexture(gl);
  }

  private initPaletteTexture(): void {
    const gl = this.gl;
    if (!gl) {
      throw new Error('No webgl');
    }

    createPaletteTexture(gl);
  }

  private initVertexBuffer(): WebGLBuffer {
    const gl = this.gl;
    if (!gl) {
      throw new Error('No webgl');
    }

    // Create a common buffer object for vertex coordinates.
    // This will be used by all shaders.
    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
      throw new Error('Failed to create a buffer object for vertex coordinates');
    }

    // Bind the buffer object to target (this is the default)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    return vertexBuffer;
  }

  private initTextureCoordBuffer(): WebGLBuffer {
    const gl = this.gl;
    if (!gl) {
      throw new Error('No webgl');
    }

    // Create a buffer object for texture coordinates
    const textureCoordBuffer = gl.createBuffer();
    if (!textureCoordBuffer) {
      throw new Error('Failed to create the buffer object (textureCoordBuffer)');
    }

    return textureCoordBuffer;
  }

  /**
   * Cleans up WebGL resources for the main canvas
   */
  public disposeMainCanvas(): void {
    if (this.mainCanvasRenderer) {
      this.mainCanvasRenderer.dispose();
      this.mainCanvasRenderer = null;
    }
    // Clean up buffers
    if (this.gl) {
      if (this.buffers.vertexBuffer) {
        this.gl.deleteBuffer(this.buffers.vertexBuffer);
        this.buffers.vertexBuffer = null;
      }
      if (this.buffers.textureCoordBuffer) {
        this.gl.deleteBuffer(this.buffers.textureCoordBuffer);
        this.buffers.textureCoordBuffer = null;
      }
    }
  }

  /**
   * Cleans up WebGL resources for the zoom canvas
   */
  public disposeZoomCanvas(): void {
    // Currently no WebGL resources to clean up for zoom canvas
    // as it uses 2D context instead of WebGL
  }
}

export const overlayCanvasController = new OverlayCanvasController();
