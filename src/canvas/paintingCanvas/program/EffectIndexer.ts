import { CustomBrush } from '../../../brush/CustomBrush';
import { Point } from '../../../types';
import { overmind } from '../../..';
import { canvasToWebGLCoordX, canvasToWebGLCoordY, shiftPoint } from '../../util/util';
import { createProgram, activateProgram } from '../../util/webglUtil';
import { stampRect, scratchSize, maskOffset, StampRect } from '../../../algorithm/effectRect';
import { activeRangeIndices, RangeIndices } from '../../../algorithm/paletteRange';
import { cycleColorIndex } from '../../../algorithm/cycle';
import { EFFECT_LIB } from './effectShaderLib';

type GLBuffers = {
  colorIndexFramebuffer: WebGLFramebuffer;
  vertexBuffer: WebGLBuffer;
  textureCoordBuffer: WebGLBuffer;
};

// Per-symmetry-copy chain state: each kaleidoscope copy is its own
// smear/blend trail (see docs/effects.md).
type CopyState = {
  save: WebGLTexture; // canvas pixels under this copy's previous stamp
  mask: WebGLTexture; // this copy's previous stamp coverage (overlap mask)
  prevOrigin: Point | null; // previous stamp's (unclamped) brush top-left
  prevRect: StampRect | null; // previous stamp's rect: save-valid texcoords
  cycleStep: number; // Cycle mode: this copy's stamp ordinal within the stroke
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
  private shadeProgram: WebGLProgram | null;
  private maskProgram: WebGLProgram | null;
  private blendProgram: WebGLProgram | null;
  private smoothProgram: WebGLProgram | null;
  private cycleProgram: WebGLProgram | null;
  private scratchFbo: WebGLFramebuffer | null;
  private brushTexture: WebGLTexture | null = null;
  private currentBrushId = 0;
  private work: WebGLTexture | null = null;
  private copyStates: CopyState[] = [];
  private scratchW = 0;
  private scratchH = 0;
  private brushW = 0;
  private brushH = 0;
  // the current stamp's origin, held for shadePass's mask-offset computation
  private curOrigin: Point | null = null;

  public constructor(gl: WebGLRenderingContext, buffers: GLBuffers) {
    this.gl = gl;
    this.buffers = buffers;
    this.smearProgram = createProgram(gl, EFFECT_VERTEX_SHADER, SMEAR_FRAGMENT_SHADER);
    this.shadeProgram = createProgram(gl, EFFECT_VERTEX_SHADER, SHADE_FRAGMENT_SHADER);
    this.maskProgram = createProgram(gl, EFFECT_VERTEX_SHADER, MASK_FRAGMENT_SHADER);
    this.blendProgram = createProgram(gl, EFFECT_VERTEX_SHADER, BLEND_FRAGMENT_SHADER);
    this.smoothProgram = createProgram(gl, EFFECT_VERTEX_SHADER, SMOOTH_FRAGMENT_SHADER);
    this.cycleProgram = createProgram(gl, EFFECT_VERTEX_SHADER, CYCLE_FRAGMENT_SHADER);
    this.scratchFbo = gl.createFramebuffer();
    console.log('Program ready (EffectIndexer: smear, shade, mask, blend, smooth, cycle)');
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
      this.curOrigin = origin;
      const rect = stampRect(origin, this.brushW, this.brushH, canvasW, canvasH);
      if (!rect) {
        // fully off-canvas: the chain breaks here, like DPaint's clipping
        state.prevOrigin = null;
        state.prevRect = null;
        continue;
      }
      if (mode !== 'Cycle') {
        this.copyCanvasRect(this.work as WebGLTexture, rect);
      }
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
      } else if (mode === 'Shade') {
        this.shadePass(rect, state);
        this.updateMask(rect, state);
      } else if (mode === 'Blend') {
        if (state.prevRect) {
          this.blendPass(rect, state);
        }
        this.updateMask(rect, state);
        const tmp = state.save;
        state.save = this.work as WebGLTexture;
        this.work = tmp;
      } else if (mode === 'Smooth') {
        this.smoothPass(rect);
      } else if (mode === 'Cycle') {
        this.cyclePass(rect, state);
      }
      state.prevOrigin = origin;
      state.prevRect = rect;
    }
    // DPaint advances the cycle color once per paint action (CCYCLE.C's
    // CycPaint, called once per MODES.C PaintIt/SymPts - i.e. once per mouse
    // move, however long a line that move draws), not once per pixel: an
    // entire dragged segment is one solid color, and the next segment gets
    // the next color. effectDraw is called once per such segment, so advance
    // here rather than inside the per-point loop above.
    if (mode === 'Cycle') {
      state.cycleStep++;
    }
  }

  public endEffectStroke(): void {
    for (const state of this.copyStates) {
      state.prevOrigin = null;
      state.prevRect = null;
      state.cycleStep = 0;
    }
  }

  public dispose(): void {
    const gl = this.gl;
    if (this.smearProgram) {
      gl.deleteProgram(this.smearProgram);
      this.smearProgram = null;
    }
    if (this.shadeProgram) {
      gl.deleteProgram(this.shadeProgram);
      this.shadeProgram = null;
    }
    if (this.maskProgram) {
      gl.deleteProgram(this.maskProgram);
      this.maskProgram = null;
    }
    if (this.blendProgram) {
      gl.deleteProgram(this.blendProgram);
      this.blendProgram = null;
    }
    if (this.smoothProgram) {
      gl.deleteProgram(this.smoothProgram);
      this.smoothProgram = null;
    }
    if (this.cycleProgram) {
      gl.deleteProgram(this.cycleProgram);
      this.cycleProgram = null;
    }
    if (this.scratchFbo) {
      gl.deleteFramebuffer(this.scratchFbo);
      this.scratchFbo = null;
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
      gl.deleteTexture(state.mask);
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

  private shadePass(rect: StampRect, state: CopyState): void {
    const gl = this.gl;
    const program = this.shadeProgram as WebGLProgram;
    activateProgram(gl, program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffers.colorIndexFramebuffer);
    gl.uniform1i(gl.getUniformLocation(program, 'u_shape'), 6);
    gl.uniform1i(gl.getUniformLocation(program, 'u_work'), 3);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.work);
    gl.uniform1f(
      gl.getUniformLocation(program, 'u_direction'),
      overmind.state.tool.shadeDirection
    );
    this.rangeUniforms(program);
    this.maskUniforms(program, state, this.curOrigin as Point);
    this.setShapeUniforms(program);
    this.drawStampQuad(program, rect);
  }

  // Renders this stamp's brush coverage into the copy's mask texture. Runs
  // on the scratch-sized framebuffer, so the viewport MUST be restored to
  // canvas size afterwards — the other indexers rely on it.
  private updateMask(rect: StampRect, state: CopyState): void {
    const gl = this.gl;
    const program = this.maskProgram as WebGLProgram;
    activateProgram(gl, program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scratchFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, state.mask, 0);
    gl.viewport(0, 0, this.scratchW, this.scratchH);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1i(gl.getUniformLocation(program, 'u_shape'), 6);
    this.setShapeUniforms(program);
    // quad over the written subrect, in scratch clip space (derived from uv)
    this.drawScratchQuad(program, rect);
    // restore global state for everyone else
    gl.viewport(
      0, 0,
      overmind.state.canvas.resolution.width,
      overmind.state.canvas.resolution.height
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffers.colorIndexFramebuffer);
  }

  private blendPass(rect: StampRect, state: CopyState): void {
    const gl = this.gl;
    const program = this.blendProgram as WebGLProgram;
    activateProgram(gl, program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffers.colorIndexFramebuffer);
    gl.uniform1i(gl.getUniformLocation(program, 'u_shape'), 6);
    gl.uniform1i(gl.getUniformLocation(program, 'u_work'), 3);
    gl.uniform1i(gl.getUniformLocation(program, 'u_save'), 4);
    gl.uniform1i(gl.getUniformLocation(program, 'u_palette'), 1);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.work);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, state.save);
    const prev = state.prevRect as StampRect;
    gl.uniform4f(gl.getUniformLocation(program, 'u_saveBounds'), prev.u0, prev.v0, prev.u1, prev.v1);
    gl.uniform1f(
      gl.getUniformLocation(program, 'u_indexedPolicy'),
      overmind.state.canvas.trueColorEnabled ? 0 : 1
    );
    this.rangeUniforms(program);
    this.maskUniforms(program, state, this.curOrigin as Point);
    this.setShapeUniforms(program);
    this.drawStampQuad(program, rect);
  }

  private smoothPass(rect: StampRect): void {
    const gl = this.gl;
    const program = this.smoothProgram as WebGLProgram;
    activateProgram(gl, program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffers.colorIndexFramebuffer);
    gl.uniform1i(gl.getUniformLocation(program, 'u_shape'), 6);
    gl.uniform1i(gl.getUniformLocation(program, 'u_work'), 3);
    gl.uniform1i(gl.getUniformLocation(program, 'u_palette'), 1);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.work);
    gl.uniform1f(
      gl.getUniformLocation(program, 'u_indexedPolicy'),
      overmind.state.canvas.trueColorEnabled ? 0 : 1
    );
    this.rangeUniforms(program);
    this.setShapeUniforms(program);
    this.drawStampQuad(program, rect);
  }

  private cyclePass(rect: StampRect, state: CopyState): void {
    const gl = this.gl;
    const program = this.cycleProgram as WebGLProgram;
    activateProgram(gl, program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffers.colorIndexFramebuffer);
    gl.uniform1i(gl.getUniformLocation(program, 'u_shape'), 6);
    const palette = overmind.state.palette;
    const range = activeRangeIndices(
      palette.ranges,
      palette.foregroundColorId,
      palette.foregroundRgb !== null,
      palette.paletteArray.length
    );
    // no range: paint plain FG, i.e. a one-color "cycle" on the FG index
    const idx = range.wholePalette
      ? Number(palette.foregroundColorId) - 1
      : cycleColorIndex(range, state.cycleStep);
    gl.uniform4f(gl.getUniformLocation(program, 'u_pixel'), idx / 255, 0, 0, 127 / 255);
    this.setShapeUniforms(program);
    this.drawStampQuad(program, rect);
  }

  // --- shared plumbing ---

  // Range restriction + policy uniforms shared by Shade/Blend/Smooth.
  private rangeUniforms(program: WebGLProgram): void {
    const gl = this.gl;
    const palette = overmind.state.palette;
    const range: RangeIndices = activeRangeIndices(
      palette.ranges,
      palette.foregroundColorId,
      palette.foregroundRgb !== null,
      palette.paletteArray.length
    );
    gl.uniform1f(gl.getUniformLocation(program, 'u_rangeStart'), range.start);
    gl.uniform1f(gl.getUniformLocation(program, 'u_rangeEnd'), range.end);
    gl.uniform1f(gl.getUniformLocation(program, 'u_wholePalette'), range.wholePalette ? 1 : 0);
  }

  // Overlap-mask uniforms shared by Shade/Blend: where (and whether) the
  // previous stamp's coverage mask applies.
  private maskUniforms(program: WebGLProgram, state: CopyState, curOrigin: Point): void {
    const gl = this.gl;
    gl.uniform1i(gl.getUniformLocation(program, 'u_mask'), 5);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, state.mask);
    if (state.prevOrigin && state.prevRect) {
      const off = maskOffset(state.prevOrigin, curOrigin, this.scratchW, this.scratchH);
      const prev = state.prevRect;
      gl.uniform1f(gl.getUniformLocation(program, 'u_hasMask'), 1);
      gl.uniform2f(gl.getUniformLocation(program, 'u_maskOffset'), off.du, off.dv);
      gl.uniform4f(gl.getUniformLocation(program, 'u_maskBounds'), prev.u0, prev.v0, prev.u1, prev.v1);
    } else {
      gl.uniform1f(gl.getUniformLocation(program, 'u_hasMask'), 0);
    }
  }

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

  // Like drawStampQuad, but positioned in the scratch texture's own clip
  // space (for the mask pass).
  private drawScratchQuad(program: WebGLProgram, rect: StampRect): void {
    const gl = this.gl;
    const xLeft = rect.u0 * 2 - 1;
    const xRight = rect.u1 * 2 - 1;
    const yBottom = rect.v0 * 2 - 1;
    const yTop = rect.v1 * 2 - 1;
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
      gl.deleteTexture(state.mask);
      state.save = this.createScratchTexture() as WebGLTexture;
      state.mask = this.createScratchTexture() as WebGLTexture;
      state.prevOrigin = null;
      state.prevRect = null;
      state.cycleStep = 0;
    }
    return this.work !== null;
  }

  private ensureCopyState(copyId: number): CopyState {
    while (this.copyStates.length <= copyId) {
      this.copyStates.push({
        save: this.createScratchTexture() as WebGLTexture,
        mask: this.createScratchTexture() as WebGLTexture,
        prevOrigin: null,
        prevRect: null,
        cycleStep: 0,
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

const SHADE_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_shape;
uniform sampler2D u_work;    // current canvas pixels under the brush
uniform sampler2D u_mask;    // previous stamp's coverage
uniform float u_hasMask;
uniform vec2 u_maskOffset;
uniform vec4 u_maskBounds;
uniform float u_direction;   // +1 shade up (toward range end), -1 down
uniform float u_rangeStart;  // 0-based palette storage indices, inclusive
uniform float u_rangeEnd;
uniform float u_wholePalette;

varying vec2 v_texCoord;
varying vec2 v_shapeCoord;

void main () {
  if (texture2D(u_shape, v_shapeCoord).a < 0.1) {
    discard;
  }
  if (u_hasMask > 0.5) {
    vec2 m = v_texCoord + u_maskOffset;
    if (m.x >= u_maskBounds.x && m.y >= u_maskBounds.y &&
        m.x <= u_maskBounds.z && m.y <= u_maskBounds.w) {
      if (texture2D(u_mask, m).r > 0.5) {
        discard; // just shaded by the immediately previous stamp
      }
    }
  }
  vec4 p = texture2D(u_work, v_texCoord);
  if (p.a > 0.9) {
    // true-color pixel: participates only when the whole palette is the
    // range; additive brightness step so shading up works from black
    if (u_wholePalette < 0.5) {
      discard;
    }
    gl_FragColor = vec4(clamp(p.rgb + u_direction * (26.0 / 255.0), 0.0, 1.0), 1.0);
    return;
  }
  float idx = floor(p.r * 255.0 + 0.5);
  if (idx < u_rangeStart || idx > u_rangeEnd) {
    discard; // out-of-range indexed pixels pass through untouched
  }
  idx = clamp(idx + u_direction, u_rangeStart, u_rangeEnd);
  gl_FragColor = vec4(idx / 255.0, 0.0, 0.0, 127.0 / 255.0);
}
`;

const MASK_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_shape;

varying vec2 v_shapeCoord;

void main () {
  if (texture2D(u_shape, v_shapeCoord).a < 0.1) {
    discard;
  }
  gl_FragColor = vec4(1.0);
}
`;

const BLEND_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_shape;
uniform sampler2D u_work;   // pixels at the current position
uniform sampler2D u_save;   // pixels saved at the previous position
uniform vec4 u_saveBounds;
uniform sampler2D u_mask;
uniform float u_hasMask;
uniform vec2 u_maskOffset;
uniform vec4 u_maskBounds;

varying vec2 v_texCoord;
varying vec2 v_shapeCoord;

${EFFECT_LIB}

void main () {
  if (texture2D(u_shape, v_shapeCoord).a < 0.1) {
    discard;
  }
  if (u_hasMask > 0.5) {
    vec2 m = v_texCoord + u_maskOffset;
    if (m.x >= u_maskBounds.x && m.y >= u_maskBounds.y &&
        m.x <= u_maskBounds.z && m.y <= u_maskBounds.w) {
      if (texture2D(u_mask, m).r > 0.5) {
        discard;
      }
    }
  }
  if (v_texCoord.x < u_saveBounds.x || v_texCoord.y < u_saveBounds.y ||
      v_texCoord.x > u_saveBounds.z || v_texCoord.y > u_saveBounds.w) {
    discard;
  }
  vec4 cur = texture2D(u_work, v_texCoord);
  vec4 prev = texture2D(u_save, v_texCoord);
  // both ends must be in range (DPaint's A-and-B range mask)
  if (!inRange(cur) || !inRange(prev)) {
    discard;
  }
  gl_FragColor = resolveColor((displayed(cur) + displayed(prev)) * 0.5);
}
`;

const SMOOTH_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_shape;
uniform sampler2D u_work;
// highp to match the vertex shader's default precision for this uniform —
// WebGL treats a precision mismatch on the same uniform name as a link error
uniform highp vec2 u_scratchSize;

varying vec2 v_texCoord;
varying vec2 v_shapeCoord;

${EFFECT_LIB}

void main () {
  if (texture2D(u_shape, v_shapeCoord).a < 0.1) {
    discard;
  }
  vec4 center = texture2D(u_work, v_texCoord);
  if (!inRange(center)) {
    discard; // only in-range pixels are written; neighbors just contribute
  }
  vec2 px = 1.0 / u_scratchSize;
  vec3 sum = vec3(0.0);
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      sum += displayed(texture2D(u_work, v_texCoord + vec2(float(dx), float(dy)) * px));
    }
  }
  gl_FragColor = resolveColor(sum / 9.0);
}
`;

const CYCLE_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D u_shape;
uniform vec4 u_pixel; // the cycling color as a packed indexed pixel

varying vec2 v_shapeCoord;

void main () {
  if (texture2D(u_shape, v_shapeCoord).a < 0.1) {
    discard;
  }
  gl_FragColor = u_pixel;
}
`;
