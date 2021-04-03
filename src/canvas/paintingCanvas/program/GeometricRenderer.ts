import { Point } from '../../../types';
import { canvasToWebGLCoordInvert, canvasToWebGLCoordX, shiftPoint } from '../../util';
import { createProgram, useProgram } from '../../webglUtil';

/* eslint-disable max-len */
export class GeometricRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = this.createProgram();
  }

  public renderPoints(points: Point[]): void {
    const gl = this.gl;

    useProgram(gl, this.program);

    // render to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // use texture units 0 and 1 for the image and palette

    const imageLoc = gl.getUniformLocation(this.program, 'u_image');
    const paletteLoc = gl.getUniformLocation(this.program, 'u_palette');
    gl.uniform1i(imageLoc, 0);
    gl.uniform1i(paletteLoc, 1);

    const a_Position = gl.getAttribLocation(this.program, 'a_Position');

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    const vertices = new Float32Array(2 * points.length);
    for (let i = 0; i < points.length; i++) {
      const shiftedPoint = shiftPoint(points[i]);
      vertices[i * 2] = canvasToWebGLCoordX(gl, shiftedPoint.x);
      vertices[i * 2 + 1] = canvasToWebGLCoordInvert(gl, shiftedPoint.y);
    }

    const resolution = gl.getUniformLocation(this.program, 'resolution');
    this.gl.uniform2f(resolution, gl.canvas.width, gl.canvas.height);

    this.gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    this.gl.drawArrays(gl.POINTS, 0, points.length);
  }

  private createProgram(): WebGLProgram {
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

    const program = createProgram(this.gl, vertexShader, fragmentShader);
    console.log('Program ready (GeometricRenderer)');
    return program;
  }
}
