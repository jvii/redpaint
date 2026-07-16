import { describe, it, expect } from 'vitest';
import { usesEffectDraw, Mode } from '../../../src/overmind/brush/mode';

describe('usesEffectDraw', () => {
  it('is true for the modes stamped through the EffectIndexer', () => {
    const effectModes: Mode[] = ['Smear', 'Shade', 'Blend', 'Smooth', 'Cycle'];
    for (const mode of effectModes) {
      expect(usesEffectDraw(mode)).toBe(true);
    }
  });

  it('is false for the plain stamping modes', () => {
    const plain: Mode[] = ['Matte', 'Color', 'Repl'];
    for (const mode of plain) {
      expect(usesEffectDraw(mode)).toBe(false);
    }
  });
});
