import { createProgram, activateProgram, bindFramebuffer } from '../../util/webglUtil';
import { ALPHA_TAG_LIB } from '../../util/alphaTagShaderLib';
import { STENCIL_TEXTURE_UNIT } from '../../util/stencilTexture';

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
  private u_stencilOn: WebGLUniformLocation | null;
  private u_stencilShow: WebGLUniformLocation | null;
  private u_stencilTexel: WebGLUniformLocation | null;
  private u_highlightIndex: WebGLUniformLocation | null;
  private u_highlightGround: WebGLUniformLocation | null;

  public constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.program = this.createProgram();
    this.a_position = gl.getAttribLocation(this.program, 'a_position');
    // createProgram leaves the program bound; the texture units never change
    // (0 = color indices, 1 = palette), so the samplers can be set once
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_image'), 0);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_palette'), 1);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_stencil'), STENCIL_TEXTURE_UNIT);
    this.u_stencilOn = gl.getUniformLocation(this.program, 'u_stencilOn');
    this.u_stencilShow = gl.getUniformLocation(this.program, 'u_stencilShow');
    this.u_stencilTexel = gl.getUniformLocation(this.program, 'u_stencilTexel');
    this.u_highlightIndex = gl.getUniformLocation(this.program, 'u_highlightIndex');
    this.u_highlightGround = gl.getUniformLocation(this.program, 'u_highlightGround');
    gl.uniform1f(this.u_highlightIndex, -1);
  }

  // 1 while a stencil is active. Uniform across the draw, so it costs no
  // divergence; the sampler is read either way (docs/stencil.md).
  public setStencilOn(on: boolean): void {
    activateProgram(this.gl, this.program);
    this.gl.uniform1f(this.u_stencilOn, on ? 1 : 0);
  }

  // 1 while the locked areas are shown as a striped sheet (docs/stencil.md).
  // Display only: nothing it draws reaches the picture.
  public setStencilShow(on: boolean): void {
    activateProgram(this.gl, this.program);
    this.gl.uniform1f(this.u_stencilShow, on ? 1 : 0);
  }

  // Shows one palette color alone, everything else dropped to the background
  // color (docs/stencil.md). Null for none; both numbers are 1-based color
  // numbers, as the palette's own ids are.
  public setColorHighlight(colorNumber: number | null, backgroundColorNumber: number): void {
    activateProgram(this.gl, this.program);
    this.gl.uniform1f(this.u_highlightIndex, colorNumber === null ? -1 : colorNumber - 1);
    this.gl.uniform1f(this.u_highlightGround, backgroundColorNumber - 1);
  }

  /**
   * Renders the canvas by drawing a full-screen quad with the color index texture
   * and converting the indices to actual colors using the palette texture.
   */
  public renderCanvas(): void {
    const gl = this.gl;

    activateProgram(gl, this.program);

    // One stencil texel in uv, for the sheet's edge test. Per draw: the texture
    // is the canvas, and the canvas is re-sized under this program.
    gl.uniform2f(this.u_stencilTexel, 1 / gl.canvas.width, 1 / gl.canvas.height);

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
    ${ALPHA_TAG_LIB}

    varying vec2 v_texcoord;
    uniform sampler2D u_image;    // Color index texture
    uniform sampler2D u_palette;  // Palette texture
    uniform sampler2D u_stencil;  // Frozen pixels, transparent where unprotected
    uniform float u_stencilOn;
    uniform float u_stencilShow;  // draw the locked areas as a striped sheet
    uniform vec2 u_stencilTexel;  // one stencil texel in uv
    uniform float u_highlightIndex;  // 0-based palette position to show alone, -1 none
    uniform float u_highlightGround; // 0-based position everything else drops to

    // The mark: stripes across the area, in picture pixels so they scale with
    // the picture the way a sheet laid over it would, and a dotted line along
    // the boundary, which is the part worth checking.
    const float STRIPE_PERIOD = 8.0;
    const float SHEET_ALPHA = 0.45;
    const vec3 SHEET_INK = vec3(0.0);
    const vec3 SHEET_PAPER = vec3(1.0);

    vec3 displayColor(vec4 pixel) {
      if (isTrueColor(pixel)) {
        return pixel.rgb; // true-color pixel: the literal RGB color
      }
      // Indexed pixel: the red channel holds the 0-based palette position. The
      // 0.5s land on the texel center of the 256x1 palette texture.
      float paletteIndex = pixel.r * 255.0;
      return texture2D(u_palette, vec2((paletteIndex + 0.5) / 256.0, 0.5)).rgb;
    }

    // The stencil's mark: a translucent striped sheet with its boundary dotted.
    // An outline alone is a picture pixel wide, which at 1:1 is one screen pixel
    // and all but invisible.
    //
    // The first float is this pixel's membership, the rest its neighbours'. The
    // dots step along the boundary rather than across the screen: a screen-space
    // pattern has a direction it lines up with, and every edge running that way
    // comes out solid instead of dotted. An unmarked neighbour to the side means
    // the boundary runs up and down here, so step along y, and the other way
    // round; a staircase has both, and either axis dots it evenly.
    vec3 marked(vec3 base, float here, float l, float r, float b, float a) {
      float stripe = step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) / STRIPE_PERIOD));
      vec3 result = mix(base, mix(SHEET_INK, SHEET_PAPER, stripe), here * SHEET_ALPHA);
      float sideways = step(0.5, (1.0 - l) + (1.0 - r));
      float along = mix(gl_FragCoord.x, gl_FragCoord.y, sideways);
      vec3 edgeColor = mix(SHEET_INK, SHEET_PAPER, mod(floor(along), 2.0));
      return mix(result, edgeColor, here * (1.0 - l * r * b * a));
    }

    float isProtected(vec2 at) {
      return 1.0 - float(isTransparent(texture2D(u_stencil, at)));
    }

    // A pixel holding the highlighted palette color. True-color pixels hold no
    // palette position, so they never match.
    float isHighlighted(vec2 at) {
      vec4 p = texture2D(u_image, at);
      float index = floor(p.r * 255.0 + 0.5);
      return float(!isTrueColor(p) && abs(index - u_highlightIndex) < 0.5);
    }

    void main() {
      // We flip Y coordinate (1.0 - v_texcoord.y) since WebGL texture coordinates are flipped
      vec2 uv = vec2(v_texcoord.x, 1.0 - v_texcoord.y);

      // Branchless so the per-pixel test cannot diverge at the stencil's edges.
      vec4 stencilPixel = texture2D(u_stencil, uv);
      float here = isProtected(uv);
      vec4 pixel = mix(texture2D(u_image, uv), stencilPixel, here * u_stencilOn);
      vec3 color = displayColor(pixel);

      // Both marks cost four neighbour samples, so each sits behind its own
      // uniform test: the same for every fragment in the draw, so it costs no
      // divergence, and the common case pays for neither.
      if (u_stencilShow * u_stencilOn > 0.5) {
        color = marked(
          color,
          here,
          isProtected(uv + vec2(u_stencilTexel.x, 0.0)),
          isProtected(uv - vec2(u_stencilTexel.x, 0.0)),
          isProtected(uv + vec2(0.0, u_stencilTexel.y)),
          isProtected(uv - vec2(0.0, u_stencilTexel.y))
        );
      }

      // One color alone: everything else goes to the background color, which
      // reveals the shape of the color rather than marking it. A mark over the
      // picture answers "where is it" only as well as the picture lets it; this
      // answers it exactly.
      if (u_highlightIndex >= 0.0) {
        vec3 ground = texture2D(u_palette, vec2((u_highlightGround + 0.5) / 256.0, 0.5)).rgb;
        // Unless the ground cannot be told from what is being shown, where
        // dropping everything to it would hide the answer along with the rest.
        // Compared as colors rather than as slots: two slots hold the same color
        // as readily as one (a Copy, a quantized palette, a cycle that brings
        // them together), and the eye only knows the color.
        vec3 shown = texture2D(u_palette, vec2((u_highlightIndex + 0.5) / 256.0, 0.5)).rgb;
        float sameAsGround = float(distance(ground, shown) < 0.004);
        float luminance = dot(ground, vec3(0.299, 0.587, 0.114));
        ground = mix(ground, mix(SHEET_PAPER, SHEET_INK, step(0.5, luminance)), sameAsGround);
        color = mix(ground, color, isHighlighted(uv));
      }

      gl_FragColor = vec4(color, 1.0);
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
