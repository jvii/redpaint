export type Mode = 'Matte' | 'Color' | 'Repl' | 'Smear' | 'Shade' | 'Blend' | 'Cycle' | 'Smooth';

// Modes whose strokes go through EffectIndexer's order-dependent per-point
// path (the canvas-reading effects, plus Cycle which needs per-point colors).
const EFFECT_DRAW_MODES: readonly Mode[] = ['Smear', 'Shade', 'Blend', 'Smooth', 'Cycle'];

export function usesEffectDraw(mode: Mode): boolean {
  return EFFECT_DRAW_MODES.includes(mode);
}
