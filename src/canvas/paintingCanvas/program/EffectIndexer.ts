import { CustomBrush } from '../../../brush/CustomBrush';
import { Point } from '../../../types';
import { overmind } from '../../..';
import { canvasToWebGLCoordX, canvasToWebGLCoordY, shiftPoint } from '../../util/util';
import { createProgram, activateProgram } from '../../util/webglUtil';
import { stampRect, scratchSize, StampRect } from '../../../algorithm/effectRect';

type GLBuffers = {
  colorIndexFramebuffer: WebGLFramebuffer;
  vertexBuffer: WebGLBuffer;
  textureCoordBuffer: WebGLBuffer;
};

// Per-symmetry-copy chain state: each kaleidoscope copy is its own
// smear/blend trail (see docs/effects.md).
type CopyState = {
  save: WebGLTexture; // canvas pixels under this copy's previous stamp
  prevOrigin: Point | null; // previous stamp's (unclamped) brush top-left
  prevRect: StampRect | null; // previous stamp's rect: save-valid texcoords
};

// Renders the canvas-reading paint modes (Smear/Shade/Blend/Smooth) and
// Cycle into the canvas color-index texture. WebGL cannot sample the texture
// being rendered into, so before each stamp the under-brush rect is copied
// GPU-side (copyTexSubImage2D) into a small brush-local scratch texture the
// effect shader samples instead. See docs/effects.md for the architecture.
export class EffectIndexer {
  private gl: WebGLRenderingContext;
  private buffers: GLBuffers;
  private smearProgram: WebGLProgram | null;
  private brushTexture: WebGLTexture | null = null;
  private currentBrushId = 0;
  private work: WebGLTexture | null = null;
  private copyStates: CopyState[] = [];
  private scratchW = 0;
  private scratchH = 0;
  private brushW = 0;
  private brushH = 0;

  public constructor(gl: WebGLRenderingContext, buffers: GLBuffers) {
    this.gl = gl;
    this.buffers = buffers;
    this.smearProgram = createProgram(gl, EFFECT_VERTEX_SHADER, SMEAR_FRAGMENT_SHADER);
    console.log('Program ready (EffectIndexer: smear)');
  }

  public effectDraw(points: Point[], brush: CustomBrush, copyId: number): void {
    const mode = overmind.state.brush.mode;
    if (!this.ensureScratch(brush)) {
      console.warn('EffectIndexer: scratch allocation failed, skipping stamp');
      return;
    }
    this.ensureBrushTexture(brush);
    const state = this.ensureCopyState(copyId);
    const canvasW = overmind.state.canvas.resolution.width;
    const canvasH = overmind.state.canvas.resolution.height;

    // Stamps are order-dependent (each reads what the previous one wrote),
    // so points are processed one by one — no batching.
    for (const point of points) {
      const shifted = shiftPoint(point);
      const origin = { x: Math.round(shifted.x) - 1, y: Math.round(shifted.y) - 1 };
      const rect = stampRect(origin, this.brushW, this.brushH, canvasW, canvasH);
      if (!rect) {
        // fully off-canvas: the chain breaks here, like DPaint's clipping
        state.prevOrigin = null;
        state.prevRect = null;
        continue;
      }
      this.copyCanvasRect(this.work as WebGLTexture, rect);
      if (mode === 'Smear') {
        if (state.prevRect) {
          this.smearPass(rect, state);
        }
        // the fresh under-brush copy becomes this copy's save; the old save
        // becomes the next stamp's work (contents fully overwritten by the
        // next copyCanvasRect within its valid region)
        const tmp = state.save;
        state.save = this.work as WebGLTexture;
        this.work = tmp;
      }
      state.prevOrigin = origin;
      state.prevRect = rect;
    }
  }

  public endEffectStroke(): void {
    for (const state of this.copyStates) {
      state.prevOrigin = null;
      state.prevRect = null;
    }
  }

  public dispose(): void {
    const gl = this.gl;
    if (this.smearProgram) {
      gl.deleteProgram(this.smearProgram);
      this.smearProgram = null;
    }
    if (this.brushTexture) {
      gl.deleteTexture(this.brushTexture);
      this.brushTexture = null;
    }
    if (this.work) {
      gl.deleteTexture(this.work);
      this.work = null;
    }
    for (const state of this.copyStates) {
      gl.deleteTexture(state.save);
    }
    this.copyStates = [];
  }

  // --- passes ---

  private smearPass(rect: StampRect, state: CopyState): void {
    const gl = this.gl;
    const program = this.smearProgram as WebGLProgram;
    activateProgram(gl, program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffers.colorIndexFramebuffer);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, state.save);
    const prev = state.prevRect as StampRect;
    gl.uniform1i(gl.getUniformLocation(program, 'u_shape'), 6);
    gl.uniform1i(gl.getUniformLocation(program, 'u_save'), 4);
    gl.uniform4f(gl.getUniformLocation(program, 'u_saveBounds'), prev.u0, prev.v0, prev.u1, prev.v1);
    this.setShapeUniforms(program);
    this.drawStampQuad(program, rect);
  }

  // --- shared plumbing ---

  private setShapeUniforms(program: WebGLProgram): void {
    const gl = this.gl;
    gl.uniform2f(gl.getUniformLocation(program, 'u_scratchSize'), this.scratchW, this.scratchH);
    gl.uniform2f(gl.getUniformLocation(program, 'u_brushSize'), this.brushW, this.brushH);
  }

  private drawStampQuad(program: WebGLProgram, rect: StampRect): void {
    const gl = this.gl;
    const xLeft = canvasToWebGLCoordX(gl, rect.quadX);
    const xRight = canvasToWebGLCoordX(gl, rect.quadX + rect.quadW);
    const yTop = canvasToWebGLCoordY(gl, rect.quadY);
    const yBottom = canvasToWebGLCoordY(gl, rect.quadY + rect.quadH);

    // two triangles; v1 is the top edge, v0 the bottom (GL v axis points up)
    const vertices = new Float32Array([
      xLeft, yTop, xLeft, yBottom, xRight, yTop,
      xLeft, yBottom, xRight, yTop, xRight, yBottom,
    ]);
    const texCoords = new Float32Array([
      rect.u0, rect.v1, rect.u0, rect.v0, rect.u1, rect.v1,
      rect.u0, rect.v0, rect.u1, rect.v1, rect.u1, rect.v0,
    ]);

    const a_texCoord = gl.getAttribLocation(program, 'a_texCoord');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.textureCoordBuffer);
    gl.enableVertexAttribArray(a_texCoord);
    gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.DYNAMIC_DRAW);

    const a_position = gl.getAttribLocation(program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertexBuffer);
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private copyCanvasRect(target: WebGLTexture, rect: StampRect): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffers.colorIndexFramebuffer);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, target);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, rect.dstX, rect.dstY, rect.srcX, rect.srcY, rect.w, rect.h);
  }

  // (Re)allocates the scratch textures when the brush size changes. Returns
  // false if allocation failed (the stamp is then skipped, never crashed).
  private ensureScratch(brush: CustomBrush): boolean {
    if (this.brushW === brush.width && this.brushH === brush.heigth && this.work) {
      return true;
    }
    this.brushW = brush.width;
    this.brushH = brush.heigth;
    const size = scratchSize(brush.width, brush.heigth);
    this.scratchW = size.w;
    this.scratchH = size.h;
    const gl = this.gl;
    if (this.work) {
      gl.deleteTexture(this.work);
    }
    this.work = this.createScratchTexture();
    for (const state of this.copyStates) {
      gl.deleteTexture(state.save);
      state.save = this.createScratchTexture() as WebGLTexture;
      state.prevOrigin = null;
      state.prevRect = null;
    }
    return this.work !== null;
  }

  private ensureCopyState(copyId: number): CopyState {
    while (this.copyStates.length <= copyId) {
      this.copyStates.push({
        save: this.createScratchTexture() as WebGLTexture,
        prevOrigin: null,
        prevRect: null,
      });
    }
    return this.copyStates[copyId];
  }

  private createScratchTexture(): WebGLTexture | null {
    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) {
      return null;
    }
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.scratchW, this.scratchH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  // The brush bitmap doubles as the effect's shape mask. DrawImageIndexer
  // keeps its own copy on unit 2; this one lives on unit 6 so the two
  // indexers never fight over a binding.
  private ensureBrushTexture(brush: CustomBrush): void {
    if (this.currentBrushId === brush.lastChanged && this.brushTexture) {
      return;
    }
    this.currentBrushId = brush.lastChanged;
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE6);
    if (!this.brushTexture) {
      this.brushTexture = gl.createTexture();
    }
    gl.bindTexture(gl.TEXTURE_2D, this.brushTexture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, brush.width, brush.heigth, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, brush.brushColorIndex.indexArray
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }
}

// Shared by all effect programs. Texcoords are brush-local over the scratch
// texture (which has a 1px apron); the brush bitmap has no apron, so its
// sampling coordinate is derived by the linear transform below.
const EFFECT_VERTEX_SHADER = `
attribute vec4 a_position;
attribute vec2 a_texCoord;

uniform vec2 u_scratchSize;
uniform vec2 u_brushSize;

varying vec2 v_texCoord;
varying vec2 v_shapeCoord;

void main () {
  gl_Position = a_position;
  v_texCoord = a_texCoord;
  v_shapeCoord = (a_texCoord * u_scratchSize - vec2(1.0)) / u_brushSize;
}
`;

const SMEAR_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_shape; // brush bitmap: alpha tag 0 = outside the shape
uniform sampler2D u_save;  // canvas pixels under the previous stamp
uniform vec4 u_saveBounds; // valid texcoords in u_save: (u0, v0, u1, v1)

varying vec2 v_texCoord;
varying vec2 v_shapeCoord;

void main () {
  if (texture2D(u_shape, v_shapeCoord).a < 0.1) {
    discard;
  }
  if (v_texCoord.x < u_saveBounds.x || v_texCoord.y < u_saveBounds.y ||
      v_texCoord.x > u_saveBounds.z || v_texCoord.y > u_saveBounds.w) {
    discard; // the previous stamp was clipped here: nothing saved to drag
  }
  // drag the previous position's pixel here, tag and all
  gl_FragColor = texture2D(u_save, v_texCoord);
}
`;
