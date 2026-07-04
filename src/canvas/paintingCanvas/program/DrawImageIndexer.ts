import { CustomBrush } from '../../../brush/CustomBrush';
import { Point } from '../../../types';
import { canvasToWebGLCoordX, canvasToWebGLCoordY, shiftPoint } from '../../util/util';
import { createProgram, activateProgram } from '../../util/webglUtil';

type GLBuffers = {
  colorIndexFramebuffer: WebGLFramebuffer;
  vertexBuffer: WebGLBuffer;
  textureCoordBuffer: WebGLBuffer;
};

export class DrawImageIndexer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private currentBrushId = 0;
  private buffers: GLBuffers;

  public constructor(gl: WebGLRenderingContext, buffers: GLBuffers) {
    this.gl = gl;
    this.program = this.createProgram();
    this.buffers = buffers;
  }

  /**
   * Cleans up WebGL resources when the indexer is no longer needed
   */
  public dispose(): void {
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
  }

  public indexDrawImage(points: Point[], brush: CustomBrush): void {
    const gl = this.gl;

    activateProgram(gl, this.program);

    // Render to to the target framebuffer (color index texture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffers.colorIndexFramebuffer);

    if (this.currentBrushId !== brush.lastChanged) {
      console.log('loading texture for brush');
      this.loadBrushAsTexture(brush);
      console.log(this.currentBrushId);
      console.log(brush.lastChanged);
    }
    this.currentBrushId = brush.lastChanged;

    const u_image = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'u_image');
    gl.uniform1i(u_image, 2); // texture unit 2

    console.log('points:' + points.length);
    console.log('point[0].y=' + points[0].y);
    console.log('brush.heigth=' + brush.heigth);
    // ei toimi oikein jos brush.height on parillinen???

    const textureCoords = new Float32Array(12 * points.length);
    const vertices = new Float32Array(12 * points.length);
    for (let i = 0; i < points.length; i++) {
      const shiftedPoint = shiftPoint(points[i]);

      const xLeft = canvasToWebGLCoordX(gl, shiftedPoint.x);
      const xRight = canvasToWebGLCoordX(gl, shiftedPoint.x + brush.width);
      const yTop = canvasToWebGLCoordY(gl, shiftedPoint.y);
      const yBottom = canvasToWebGLCoordY(gl, shiftedPoint.y + brush.heigth);

      const offset = i * 12;

      // 1st triangle

      vertices[0 + offset] = xLeft;
      vertices[1 + offset] = yTop;
      textureCoords[0 + offset] = 0.0;
      textureCoords[1 + offset] = 1.0;

      vertices[2 + offset] = xLeft;
      vertices[3 + offset] = yBottom;
      textureCoords[2 + offset] = 0.0;
      textureCoords[3 + offset] = 0.0;

      vertices[4 + offset] = xRight;
      vertices[5 + offset] = yTop;
      textureCoords[4 + offset] = 1.0;
      textureCoords[5 + offset] = 1.0;

      // 2nd triangle

      vertices[6 + offset] = xLeft;
      vertices[7 + offset] = yBottom;
      textureCoords[6 + offset] = 0.0;
      textureCoords[7 + offset] = 0.0;

      vertices[8 + offset] = xRight;
      vertices[9 + offset] = yTop;
      textureCoords[8 + offset] = 1.0;
      textureCoords[9 + offset] = 1.0;

      vertices[10 + offset] = xRight;
      vertices[11 + offset] = yBottom;
      textureCoords[10 + offset] = 1.0;
      textureCoords[11 + offset] = 0.0;
    }

    // texture coords

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.textureCoordBuffer);

    const a_texCoord = gl.getAttribLocation(this.program, 'a_texCoord');
    gl.enableVertexAttribArray(a_texCoord);

    gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, textureCoords, gl.DYNAMIC_DRAW);

    // vertex coords

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertexBuffer);

    const a_position = gl.getAttribLocation(this.program, 'a_position');

    // Assign the buffer object to a_position variable
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_position variable
    gl.enableVertexAttribArray(a_position);

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    this.gl.drawArrays(gl.TRIANGLES, 0, points.length * 6);
  }

  private createProgram(): WebGLProgram {
    const vertexShader = `
    attribute vec4 a_position;
    attribute vec2 a_texCoord;

    varying vec2 v_texCoord;

    void main () {
      gl_Position = a_position;

      // Pass the texcoord to the fragment shader.
      v_texCoord = a_texCoord;
    }
    `;

    const fragmentShader = `
    precision mediump float;

    uniform sampler2D u_image;
    varying vec2 v_texCoord;

    void main () {
      vec4 color = texture2D(u_image, v_texCoord);

      if (color.a > 0.9) {
        // true-color brush pixel: write the literal color, keep the tag
        gl_FragColor = vec4(color.rgb, 1.0);
        return;
      }
      if (color.r == 0.0) {
        discard; // index zero means this pixel of the brush is transparent
      }
      // indexed brush pixel: write a normalized indexed pixel
      gl_FragColor = vec4(color.r, 0.0, 0.0, 127.0/255.0);
    }
    `;

    const program = createProgram(this.gl, vertexShader, fragmentShader);
    console.log('Program ready (DrawImageIndexer)');

    return program;
  }

  private loadBrushAsTexture(brush: CustomBrush): void {
    const gl = this.gl;

    // We store the brush as a source texture in texture unit 2 so we
    // call gl.activeTexture before gl.bindTexture

    gl.activeTexture(gl.TEXTURE2);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = brush.width;
    const height = brush.heigth;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      width,
      height,
      border,
      srcFormat,
      srcType,
      brush.brushColorIndex.indexArray
    );

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }
}
