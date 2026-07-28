import { FillShape } from '../../algorithm/fillShape';
import { circleRowSpans, ellipseRowSpans, RowSpanTable } from '../../algorithm/rowSpans';

// Packs a circle/ellipse's exact row-span table (rowSpans.ts) into an RGBA
// texture the Gradient and Pattern fill shaders sample per-fragment instead
// of testing the shape against a continuous ellipse equation — see
// shapeFillShaderLib.ts's rowSpanInside(). Each texel is one local row: R/G
// pack that row's min local x, B/A pack its max, both as unsigned 16-bit
// values biased by ROW_SPAN_OFFSET so negative local offsets stay
// representable in unsigned bytes. A shape radius anywhere near
// ROW_SPAN_OFFSET (32768px) is far outside any canvas this app supports.
export const ROW_SPAN_OFFSET = 32768;

export function encodeRowSpanTexture(table: RowSpanTable): { height: number; data: Uint8Array } {
  const height = table.spans.length;
  const data = new Uint8Array(height * 4);
  for (let i = 0; i < height; i++) {
    const span = table.spans[i];
    const min = span.min + ROW_SPAN_OFFSET;
    const max = span.max + ROW_SPAN_OFFSET;
    data[i * 4] = (min >> 8) & 0xff;
    data[i * 4 + 1] = min & 0xff;
    data[i * 4 + 2] = (max >> 8) & 0xff;
    data[i * 4 + 3] = max & 0xff;
  }
  return { height, data };
}

// Cache key for "is this the same shape geometry as last upload" — center
// is deliberately excluded: every symmetry copy of one stroke shares the
// same radius/rotation and only translates, so all copies in a frame reuse
// one upload (RowSpanTexture.use below), the same way the rest of the
// gradient fill pipeline already shares per-stroke work (seed, dither hash)
// across copies instead of redoing it per copy.
function cacheKey(shape: FillShape): string | null {
  if (shape.kind === 'circle') {
    return `circle:${shape.radius}`;
  }
  if (shape.kind === 'ellipse') {
    return `ellipse:${shape.radiusX}:${shape.radiusY}:${shape.rotationAngle}`;
  }
  return null;
}

function tableForShape(shape: FillShape): RowSpanTable | null {
  if (shape.kind === 'circle') {
    return circleRowSpans(shape.radius);
  }
  if (shape.kind === 'ellipse') {
    return ellipseRowSpans(shape.radiusX, shape.radiusY, shape.rotationAngle);
  }
  return null;
}

// Sets the two row-span uniforms (yMin/rowCount) from the texture the
// caller just uploaded/bound via RowSpanTexture.use — kept separate from
// applyGradientUniforms/applyPatternUniforms because it's only meaningful
// for shapeKind 1/2 and depends on the texture upload having already
// happened this draw call.
export function applyRowSpanUniforms(
  gl: WebGLRenderingContext,
  locations: { [name: string]: WebGLUniformLocation | null },
  rowSpanTexture: { yMin: number; rowCount: number }
): void {
  gl.uniform1f(locations['u_rowSpanYMin'], rowSpanTexture.yMin);
  gl.uniform1f(locations['u_rowSpanRowCount'], rowSpanTexture.rowCount);
}

// One GL texture + upload cache. Each of the four fill renderers
// (Gradient/Pattern x commit/preview) owns its own instance: the commit and
// preview paths are different WebGL contexts (paintingCanvas vs
// overlayCanvas) and can't share a texture object, and Gradient/Pattern
// each need their own texture unit within a context (see
// GradientGeometricIndexer/PatternGeometricIndexer's ROW_SPAN_TEXTURE_UNIT).
export class RowSpanTexture {
  private gl: WebGLRenderingContext;
  private textureUnit: number;
  private texture: WebGLTexture | null = null;
  private lastKey: string | null = null;
  // the override table this instance currently holds, for the caller-owned
  // cache in use() below
  private lastTable: RowSpanTable | null = null;
  public yMin = 0;
  public rowCount = 0;

  public constructor(gl: WebGLRenderingContext, textureUnit: number) {
    this.gl = gl;
    this.textureUnit = textureUnit;
  }

  // Binds this shape's row-span texture to this instance's texture unit,
  // re-uploading only when the shape's geometry actually changed since the
  // last call (the same cache-by-key pattern PatternGeometricIndexer uses
  // for its pattern bitmap). Returns false for shapes with no row-span
  // table (rect/polygon) — callers should skip the row-span branch entirely
  // rather than bind a stale or empty texture.
  //
  // `overrideTable`, if given, is uploaded instead of the table derived
  // from `shape` — the Fill Style preview swatch's escape hatch for using
  // its own ellipse rasterization (symmetricFilledEllipse) instead of the
  // real filledCircle/filledEllipse, so all three of that swatch's fill
  // modes agree with each other rather than the real (but, at that small
  // preview resolution, visibly asymmetric) shape. Cached by table
  // identity, not by a geometry key: the caller owns the table, so it's the
  // caller that decides when the shape changed (the preview memoizes its
  // table on the radii). Without this, a dialog left open while color
  // cycling runs re-encodes and re-uploads an unchanged table every
  // animation frame.
  public use(shape: FillShape, overrideTable?: RowSpanTable): boolean {
    if (overrideTable) {
      if (overrideTable !== this.lastTable) {
        this.upload(overrideTable);
      } else {
        this.bind();
      }
      // next non-override call must not think its own key is still cached
      this.lastKey = null;
      return true;
    }
    const key = cacheKey(shape);
    if (key === null) {
      return false;
    }
    if (key !== this.lastKey) {
      const table = tableForShape(shape);
      if (!table) {
        return false;
      }
      this.upload(table);
      this.lastKey = key;
    } else {
      this.bind();
    }
    return true;
  }

  private bind(): void {
    this.gl.activeTexture(this.gl.TEXTURE0 + this.textureUnit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
  }

  private upload(table: RowSpanTable): void {
    this.lastTable = table;
    const gl = this.gl;
    const { height, data } = encodeRowSpanTexture(table);
    gl.activeTexture(gl.TEXTURE0 + this.textureUnit);
    if (!this.texture) {
      this.texture = gl.createTexture();
    }
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.yMin = table.yMin;
    this.rowCount = height;
  }

  public dispose(): void {
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
  }
}
