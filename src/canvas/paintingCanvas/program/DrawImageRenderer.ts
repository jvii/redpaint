/* eslint-disable max-len */
import { createProgram, activateProgram } from '../../util/webglUtil';

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
  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = this.createProgram();
  }

  /**
   * Renders the canvas by drawing a full-screen quad with the color index texture
   * and converting the indices to actual colors using the palette texture.
   */
  public renderCanvas(): void {
    const gl = this.gl;

    activateProgram(gl, this.program);

    // Render directly to the canvas (not to a framebuffer)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Set up texture uniforms
    // u_image: texture unit 0 contains the color indices
    // u_palette: texture unit 1 contains the palette colors
    const imageLoc = gl.getUniformLocation(this.program, 'u_image');
    const paletteLoc = gl.getUniformLocation(this.program, 'u_palette');
    gl.uniform1i(imageLoc, 0); // Use texture unit 0 for color indices
    gl.uniform1i(paletteLoc, 1); // Use texture unit 1 for palette

    // Set up vertex position attribute
    const a_position = gl.getAttribLocation(this.program, 'a_position');

    // Assign the buffer object to a_position variable
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_position variable
    gl.enableVertexAttribArray(a_position);

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

    // Fragment shader: samples the color index texture and converts to RGB using palette
    const fragmentShader = `
    // This fragment shader converts indexed colors to actual RGB colors using a palette texture
    precision lowp float;  // Use low precision for better performance since we're dealing with 8-bit colors

    varying vec2 v_texcoord;
    uniform sampler2D u_image;    // Color index texture
    uniform sampler2D u_palette;  // Palette texture

    void main() {
      // Get the color index from the image texture
      // We flip Y coordinate (1.0 - v_texcoord.y) since WebGL texture coordinates are flipped
      // texture2D().r gets the red channel which contains our index
      // Multiply by 255 to convert from 0-1 range to 0-255 range
      // Subtract 1 since indices are stored as index+1 to avoid transparency issues
      lowp float colorNumber = texture2D(u_image, vec2(v_texcoord.x, 1.0 - v_texcoord.y)).r * 255.0 - 1.0;

      // Look up the actual color from the palette texture
      // We add 0.5 and divide by 256 to get the correct texel center
      // The 0.5 Y coordinate accesses the middle of the 1-pixel high palette texture
      gl_FragColor = texture2D(u_palette, vec2((colorNumber + 0.5) / 256.0, 0.5));
    }
    `;

    // Alternative fragment shader for true color images with alpha channel
    // This is currently not used but kept for reference
    const fragmentShaderTrueColor = `
    precision mediump float;

    varying vec2 v_texcoord;
    uniform sampler2D u_image;
    uniform sampler2D u_palette;

    void main() {
      vec4 colorIndexValue = texture2D(u_image, vec2(v_texcoord.x, 1.0 - v_texcoord.y));
      if (colorIndexValue.a == 0.0) {
        //gl_FragColor = vec4(colorIndexValue.r, colorIndexValue.g ,colorIndexValue.b , 0.0);
        gl_FragColor = vec4(1.0, 1.0, 1.0, 0.0);
      }
      else {
        float colorNumber = colorIndexValue.r * 255.0 - 1.0;
        gl_FragColor = texture2D(u_palette, vec2((colorNumber + 0.5) / 256.0, 0.5));
      }
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
