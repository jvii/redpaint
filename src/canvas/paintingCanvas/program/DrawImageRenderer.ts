/* eslint-disable max-len */
import { createProgram, activateProgram, bindFramebuffer } from '../../util/webglUtil';

/**
 * DrawImageRenderer is responsible for rendering the main canvas using WebGL.
 * It takes a color index texture and a palette texture, and converts the color indices
 * to actual RGB colors using the palette.
 */
export class DrawImageRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private vertexBuffer: WebGLBuffer;

  // Static array for quad positions - never changes
  private static readonly QUAD_POSITIONS = new Float32Array([
    1,
    1, // top right
    -1,
    1, // top left
    -1,
    -1, // bottom left
    1,
    1, // top right
    -1,
    -1, // bottom left
    1,
    -1, // bottom right
  ]);

  /**
   * Creates a new DrawImageRenderer.
   * @param gl The WebGL rendering context
   */
  // location looked up once: getAttribLocation is a driver round-trip, too
  // slow for per-draw-call use
  private a_position: number;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = this.createProgram();
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    // createProgram leaves the program bound; the texture units never change
    // (0 = color indices, 1 = palette), so the samplers can be set once
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_image'), 0);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_palette'), 1);
  }

  /**
   * Renders the canvas by drawing a full-screen quad with the color index texture
   * and converting the indices to actual colors using the palette texture.
   */
  public renderCanvas(): void {
    const gl = this.gl;

    activateProgram(gl, this.program);

    // Render directly to the canvas (not to a framebuffer)
    bindFramebuffer(gl, null);

    // Assign the buffer object to a_position variable
    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_position variable
    gl.enableVertexAttribArray(this.a_position);

    // Define vertices for a full-screen quad (two triangles)
    // The quad is defined in normalized device coordinates (-1 to 1)
    gl.bufferData(gl.ARRAY_BUFFER, DrawImageRenderer.QUAD_POSITIONS, gl.STATIC_DRAW);

    // Draw the quad (6 vertices = 2 triangles)
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /**
   * Creates and compiles the WebGL shader program.
   * @returns The compiled WebGL program
   */
  private createProgram(): WebGLProgram {
    // Vertex shader: transforms vertices and calculates texture coordinates
    const vertexShader = `
    attribute vec4 a_position;
    varying vec2 v_texcoord;

    void main() {
      gl_Position = a_position;

      // Convert position coordinates to texture coordinates
      // Position is in range [-1, 1], convert to [0, 1] for texture sampling
      v_texcoord = a_position.xy * vec2(0.5, -0.5) + 0.5;
    }
    `;

    // Fragment shader: samples the color index texture; the alpha byte tags
    // each pixel as indexed (palette lookup) or true color (literal RGB), see
    // docs/true-color-mode.md
    const fragmentShader = `
    precision mediump float;

    varying vec2 v_texcoord;
    uniform sampler2D u_image;    // Color index texture
    uniform sampler2D u_palette;  // Palette texture

    void main() {
      // We flip Y coordinate (1.0 - v_texcoord.y) since WebGL texture coordinates are flipped
      vec4 pixel = texture2D(u_image, vec2(v_texcoord.x, 1.0 - v_texcoord.y));

      if (pixel.a > 0.9) {
        // true-color pixel: the literal RGB color
        gl_FragColor = vec4(pixel.rgb, 1.0);
        return;
      }

      // Indexed pixel: the red channel contains the 0-based palette position.
      // Multiply by 255 to convert from 0-1 range to 0-255 range.
      float paletteIndex = pixel.r * 255.0;

      // Look up the actual color from the palette texture
      // We add 0.5 and divide by 256 to get the correct texel center
      // The 0.5 Y coordinate accesses the middle of the 1-pixel high palette texture
      gl_FragColor = texture2D(u_palette, vec2((paletteIndex + 0.5) / 256.0, 0.5));
    }
    `;

    // Create and compile the program
    const program = createProgram(this.gl, vertexShader, fragmentShader);
    console.log('Program ready (DrawImageRenderer)');
    return program;
  }

  /**
   * Cleans up WebGL resources when the renderer is no longer needed.
   * This should be called when the renderer is being destroyed.
   */
  public dispose(): void {
    const gl = this.gl;

    // Delete the vertex buffer
    if (this.vertexBuffer) {
      gl.deleteBuffer(this.vertexBuffer);
      this.vertexBuffer = null;
    }

    // Delete the shader program
    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
  }
}
