import { RefObject, useEffect, useRef } from 'react';
import { paletteTextureData } from '../../algorithm/cycle';
import { Color } from '../../types';
import { PaletteRange } from '../../overmind/palette/state';
import { OverlayGeometricRenderer } from '../../canvas/overlayCanvas/program/OverlayGeometricRenderer';
import { OverlayGradientRenderer } from '../../canvas/overlayCanvas/program/OverlayGradientRenderer';
import { OverlayPatternRenderer } from '../../canvas/overlayCanvas/program/OverlayPatternRenderer';

// Shared scaffolding for the two off-canvas fill-style previews: the Fill Style
// requester's big ellipse swatch (useFillStylePreview) and the menubar's Color
// Fill Box (useFillStyleSwatch). Both paint through the exact same renderer
// classes the overlay canvas uses for its live drag preview, so neither can
// drift from what a real fill puts on the page; this module is just the
// context/lifecycle both need to do that.

export type FillPreviewGL = {
  gl: WebGLRenderingContext;
  geometric: OverlayGeometricRenderer;
  gradient: OverlayGradientRenderer;
  pattern: OverlayPatternRenderer;
};

// One-time setup per mount: WebGL context, a shared vertex buffer (bound once;
// every renderer's draw call assumes ARRAY_BUFFER is already bound, same as the
// real overlay canvas setup), and a palette texture at unit 1, mirroring
// OverlayCanvasController's initPaletteTexture.
export function useFillPreviewGL(
  canvasRef: RefObject<HTMLCanvasElement>
): RefObject<FillPreviewGL | null> {
  const glRef = useRef<FillPreviewGL | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    // width/height are set as JSX attributes (not here) so the canvas never has
    // an unset, mismatched-with-CSS intrinsic size for Safari to lay out its
    // container against before this effect runs (Safari doesn't always reflow
    // an auto-height ancestor when a canvas's size changes imperatively
    // afterward, only once some other change forces a relayout. antialias:
    // false to match the main/overlay canvases) GL_LINES antialiasing blends
    // adjacent scanline rows (symmetricFilledEllipse's fill technique) at their
    // edges, and image-rendering: pixelated then upscales those blended edge
    // pixels into visible dotted artifacts.
    const gl = canvas.getContext('webgl', { antialias: false });
    if (!gl) {
      return;
    }

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    gl.activeTexture(gl.TEXTURE1);
    const paletteTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, paletteTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    glRef.current = {
      gl,
      geometric: new OverlayGeometricRenderer(gl),
      gradient: new OverlayGradientRenderer(gl),
      pattern: new OverlayPatternRenderer(gl),
    };

    return (): void => {
      glRef.current?.geometric.dispose();
      glRef.current?.gradient.dispose();
      glRef.current?.pattern.dispose();
      gl.deleteTexture(paletteTex);
      gl.deleteBuffer(vertexBuffer);
      glRef.current = null;
    };
  }, [canvasRef]);

  return glRef;
}

// Re-uploads unit 1 with the palette as the display currently shows it
// (cycleOffsets folded in), then clears to transparent and sets the viewport.
// Called at the top of every preview redraw: cycling is one of the things these
// previews react to, so the texture is never uploaded just once.
export function beginPreviewFrame(
  gl: WebGLRenderingContext,
  palette: { [id: string]: Color },
  ranges: (PaletteRange | null)[],
  cycleOffsets: number[],
  width: number,
  height: number
): void {
  gl.activeTexture(gl.TEXTURE1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    256,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    paletteTextureData(palette, ranges, cycleOffsets)
  );

  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}
