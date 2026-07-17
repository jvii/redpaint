export type Mode = 'Matte' | 'Color' | 'Repl' | 'Smear' | 'Shade' | 'Blend' | 'Cycle' | 'Smooth';

// Modes whose strokes go through EffectIndexer's order-dependent per-point
// path (the canvas-reading effects, plus Cycle which needs per-point colors).
const EFFECT_DRAW_MODES: readonly Mode[] = ['Smear', 'Shade', 'Blend', 'Smooth', 'Cycle'];

export function usesEffectDraw(mode: Mode): boolean {
  return EFFECT_DRAW_MODES.includes(mode);
}

// Modes that show (and paint through, for Matte/DrawImageIndexer-routed
// modes) the pristine matte bitmap rather than the FG-colorized one — the
// two modes where a captured brush's own color is the point (Matte previews
// its transparency; Repl stamps the matte bitmap with holes filled from BG).
// Every other mode's overlay cursor shows the colorized brush, even though
// the canvas-reading effects only ever read its alpha as a shape mask.
const MATTE_BRUSH_MODES: readonly Mode[] = ['Matte', 'Repl'];

export function usesColorizedBrush(mode: Mode): boolean {
  return !MATTE_BRUSH_MODES.includes(mode);
}
