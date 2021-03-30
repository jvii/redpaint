/* eslint-disable max-len */
import { overmind } from '../..';
import {
  canvasToWebGLCoordInvert,
  canvasToWebGLCoordX,
  canvasToWebGLCoordY,
  shiftPoint,
} from '../../colorIndex/util';
import { Line, Point } from '../../types';
import { CanvasController } from '../CanvasController';
import { GeometricIndexer } from './program/GeometricIndexer';

// PaintingCanvasController is a singleton responsible for controlling
// the two painting canvases in the app: MainCanvas and ZoomCanvas.
// Note that overlay canvases are controllod separately by OverlayCanvasController.
export class PaintingCanvasControllerSimple implements CanvasController {
  private mainCanvas: HTMLCanvasElement;
  private zoomCanvas: HTMLCanvasElement;
  private zoomCanvasCtx: CanvasRenderingContext2D | null = null;
  private gl: WebGLRenderingContext | null = null;
  private frameBufferColorIndex: WebGLFramebuffer | null = null;
  private colorIndexerProgram: WebGLProgram | null = null;
  private geometricRendererProgram: WebGLProgram | null = null;
  private drawImageRendererProgram: WebGLProgram | null = null;
  private currentColorIndex = 0;

  private geometricIndexer: GeometricIndexer | null = null;

  constructor() {
    this.mainCanvas = document.createElement('canvas');
    this.zoomCanvas = document.createElement('canvas');
  }

  attachMainCanvas(mainCanvas: HTMLCanvasElement): void {
    this.mainCanvas = mainCanvas;

    const gl = mainCanvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      antialias: false,
    });
    if (!gl) {
      throw 'No webgl';
    }
    this.gl = gl;
    this.init();
  }

  attachZoomCanvas(zoomCanvas: HTMLCanvasElement): void {
    this.zoomCanvas = zoomCanvas;
    this.zoomCanvasCtx = zoomCanvas.getContext('2d', {
      alpha: true,
      desynchronized: false,
    });
  }

  points(points: Point[], colorIndex: number): void {
    //this.indexPoints(points, colorIndex);
    //this.renderPoints(points);
    this.geometricIndexer?.indexPoints(points, colorIndex);
    this.renderCanvas();
  }

  private indexPoints(points: Point[], colorIndex: number): void {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    if (!this.colorIndexerProgram) {
      return;
    }

    if (gl.getParameter(gl.CURRENT_PROGRAM) !== this.colorIndexerProgram) {
      console.log('switching webgl program colorIndexerProgram');
      gl.useProgram(this.colorIndexerProgram);
    }

    if (colorIndex !== this.currentColorIndex) {
      console.log('updating color index uniform');
      this.currentColorIndex = colorIndex;
      const u_colorIndex = gl.getUniformLocation(this.colorIndexerProgram, 'u_colorIndex');
      gl.uniform1f(u_colorIndex, colorIndex);
    }

    const a_Position = gl.getAttribLocation(this.colorIndexerProgram, 'a_Position');

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    const vertices = new Float32Array(2 * points.length);
    for (let i = 0; i < points.length; i++) {
      const shiftedPoint = shiftPoint(points[i]);
      vertices[i * 2] = canvasToWebGLCoordX(gl, shiftedPoint.x);
      //vertices[i * 2 + 1] = canvasToWebGLCoordInvert(gl, shiftedPoint.y);
      vertices[i * 2 + 1] = canvasToWebGLCoordY(gl, shiftedPoint.y);
    }

    // render to the color index texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBufferColorIndex);

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.POINTS, 0, points.length);
  }

  lines(lines: Line[], colorIndex: number): void {
    //TODO
  }

  getColorIndexFrameBuffer(): WebGLFramebuffer {
    if (!this.frameBufferColorIndex) {
      throw 'No frambuffer for color index found';
    }
    return this.frameBufferColorIndex;
  }

  renderCanvas(): void {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    if (!this.drawImageRendererProgram) {
      return;
    }

    if (gl.getParameter(gl.CURRENT_PROGRAM) !== this.drawImageRendererProgram) {
      console.log('switching webgl program drawImageRendererProgram');
      gl.useProgram(this.drawImageRendererProgram);
    }

    // render to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Setup a unit quad

    // tell it to use texture units 0 and 1 for the image and palette

    const imageLoc = gl.getUniformLocation(this.drawImageRendererProgram, 'u_image');
    const paletteLoc = gl.getUniformLocation(this.drawImageRendererProgram, 'u_palette');
    gl.uniform1i(imageLoc, 0);
    gl.uniform1i(paletteLoc, 1);

    const a_Position = gl.getAttribLocation(this.drawImageRendererProgram, 'a_position');

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    const positions = [1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    // count = positions.length / 2 = 6
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  init(): void {
    // initialize all shaders here
    // init color index texture

    // color index texture always in texture unit 0
    // palette texture always in texture unit 1
    // brush texture always in texture unit 2

    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    console.log('Initialising...' + this.gl?.drawingBufferWidth);

    this.initPaletteTexture();
    this.initVertexBuffer();
    this.initColorIndexTexture();

    this.geometricIndexer = new GeometricIndexer(gl, this);
    //this.initColorIndexerProgram();
    //this.initGeometricRendererProgram();
    this.initDrawImageRendererProgram();
  }

  private initColorIndexerProgram() {
    const vertexShader = `
    attribute vec4 a_Position;

    void main () {
      gl_Position = a_Position;
      gl_PointSize = 1.0;
    }
    `;

    const fragmentShader = `
    precision mediump float;

    uniform float u_colorIndex;

    void main () {
      gl_FragColor = vec4(u_colorIndex/255.0, 0.0, 0.0, 1.0);
    }
    `;

    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) {
      return;
    }
    gl.shaderSource(vs, vertexShader);
    gl.compileShader(vs);

    // Catch some possible errors on vertex shader
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(vs));
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) {
      return;
    }
    gl.shaderSource(fs, fragmentShader);
    gl.compileShader(fs);

    // Catch some possible errors on fragment shader
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(fs));
    }

    // Compile to program
    const program = gl.createProgram();
    if (!program) {
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    // Catch some possible errors on program
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
    }

    this.colorIndexerProgram = program;
    console.log('Program ready (colorIndexerProgram)');
  }

  private initGeometricRendererProgram() {
    const vertexShader = `
    attribute vec4 a_Position;

    void main () {
      gl_Position = a_Position;
      gl_PointSize = 1.0;
    }
    `;

    const fragmentShader = `
    precision mediump float;

    uniform vec2 resolution;
    uniform sampler2D u_image;
    uniform sampler2D u_palette;

    void main() {
      vec2 position = vec2((gl_FragCoord.x) / (resolution.x), 1.0 - (gl_FragCoord.y / (resolution.y)));
      float index = texture2D(u_image, position).r * 255.0 - 1.0;
      /*
      if (index < 0.1) {
        gl_FragColor = vec4(1,1,1,1);
      }
      else {
        gl_FragColor = texture2D(u_palette, vec2((index + 0.5) / 256.0, 0.5));
      }
      */
      gl_FragColor = texture2D(u_palette, vec2((index + 0.5) / 256.0, 0.5));
      //gl_FragColor = vec4(1,1,1,1);
    }
    `;

    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) {
      return;
    }
    gl.shaderSource(vs, vertexShader);
    gl.compileShader(vs);

    // Catch some possible errors on vertex shader
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(vs));
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) {
      return;
    }
    gl.shaderSource(fs, fragmentShader);
    gl.compileShader(fs);

    // Catch some possible errors on fragment shader
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(fs));
    }

    // Compile the program
    const program = gl.createProgram();
    if (!program) {
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Catch some possible errors on program
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
    }

    this.geometricRendererProgram = program;
    console.log('Program ready (geometricRendererProgram)');
  }

  private initDrawImageRendererProgram() {
    const vertexShader = `
    attribute vec4 a_position;
    varying vec2 v_texcoord;

    void main() {
      gl_Position = a_position;

      // assuming a unit quad for position we can just use that for texcoords
      v_texcoord = a_position.xy * vec2(0.5, 0.5) + 0.5;
    }
    `;

    const fragmentShader = `
    precision mediump float;

    varying vec2 v_texcoord;
    uniform sampler2D u_image;
    uniform sampler2D u_palette;

    void main() {
      float index = texture2D(u_image, vec2(v_texcoord.x, 1.0 - v_texcoord.y)).r * 255.0 - 1.0;
      gl_FragColor = texture2D(u_palette, vec2((index + 0.5) / 256.0, 0.5));
    }
    `;

    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) {
      return;
    }
    gl.shaderSource(vs, vertexShader);
    gl.compileShader(vs);

    // Catch some possible errors on vertex shader
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(vs));
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) {
      return;
    }
    gl.shaderSource(fs, fragmentShader);
    gl.compileShader(fs);

    // Catch some possible errors on fragment shader
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(fs));
    }

    // Compile the program
    const program = gl.createProgram();
    if (!program) {
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Catch some possible errors on program
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
    }

    this.drawImageRendererProgram = program;
    console.log('Program ready (drawImageRendererProgram)');
  }

  private initColorIndexTexture() {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    // Initialize the color index texture.
    // This texture is used both as a render target (when indexing)
    // and as source texture (when rendering).

    // As a source texture we store the color index in texture unit 0 so we
    // call gl.activeTexture before gl.bindTexture

    gl.activeTexture(gl.TEXTURE0);

    const targetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const targetTextureWidth = overmind.state.canvas.resolution.width;
    const targetTextureHeight = overmind.state.canvas.resolution.height;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    // initialize the color index matrix with the background color
    const backgroundColor = Number(overmind.state.palette.backgroundColorId);
    const data = new Uint8Array(targetTextureHeight * targetTextureWidth * 4).fill(backgroundColor);
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      targetTextureWidth,
      targetTextureHeight,
      border,
      format,
      type,
      data
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.viewport(0, 0, targetTextureWidth, targetTextureHeight);

    // create and bind the framebuffer for rendering to this texture

    this.frameBufferColorIndex = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBufferColorIndex);

    // attach the texture as the first color attachment

    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);
  }

  private initPaletteTexture(): void {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    const paletteTexture = new Uint8Array(256 * 4);
    const palette = overmind.state.palette.paletteArray;
    for (let i = 0; i < palette.length; i++) {
      paletteTexture[i * 4 + 0] = palette[i].r;
      paletteTexture[i * 4 + 1] = palette[i].g;
      paletteTexture[i * 4 + 2] = palette[i].b;
      paletteTexture[i * 4 + 3] = 255;
    }

    // We store the palette as a source texture in texture unit 1 so we
    // call gl.activeTexture before gl.bindTexture

    gl.activeTexture(gl.TEXTURE1);

    const paletteTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, paletteTex);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, paletteTexture);
  }

  private initVertexBuffer(): void {
    const gl = this.gl;
    if (!gl) {
      throw 'No webgl';
    }

    // Create a buffer object for vertex coordinates
    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
      console.log('Failed to create the buffer object ');
      return;
    }

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  }
}

//export const paintingCanvasController = new PaintingCanvasControllerSimple();
