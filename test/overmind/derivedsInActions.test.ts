import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Actions must not read `derived` state.
//
// Overmind deriveds are not reliable inside an action: they can return the
// value from before the action's own mutations. That is harmless where nothing
// has been written yet, which is why it goes unnoticed — and then costs a whole
// afternoon the first time an action replaces the palette and reads it back.
//
// Both instances found were exactly that shape and both were invisible in the
// common case, because the stale value was usually the same as the fresh one:
//
//  - applyScreenFormat built its remap from paletteArray after replacePalette,
//    so a True Color picture converted to 256 colors had its pixels mapped
//    against the old 32-color palette while the screen showed the new one.
//    Every index pointed at an unrelated color; white text came out purple.
//  - setUndoPoint recorded paletteArray straight after such a change, so the
//    entry carried the previous palette. Invisible until you pressed redo,
//    which brought the picture back with the wrong 32 colors.
//
// The fix in both cases is to read the raw state the derived is computed from
// (`Object.values(state.palette.palette)`), or the value just installed. Where
// a derivation is genuinely wanted in an action, export a plain function over
// raw state and call that — `foregroundPaintColorOf(state.palette)` in
// palette/state.ts is the pattern.
const OVERMIND = join(__dirname, '..', '..', 'src', 'overmind');

function modules(): string[] {
  return readdirSync(OVERMIND, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

// Every `name: derived(...)` declared in a module's state.
function derivedNames(module: string): string[] {
  let source: string;
  try {
    source = readFileSync(join(OVERMIND, module, 'state.ts'), 'utf8');
  } catch {
    return [];
  }
  return [...source.matchAll(/^\s*(\w+)\s*:\s*derived\(/gm)].map((match) => match[1]);
}

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('overmind actions', () => {
  const allDerived = [...new Set(modules().flatMap(derivedNames))];

  test('there are deriveds to check for', () => {
    expect(allDerived.length).toBeGreaterThan(5);
    expect(allDerived).toContain('paletteArray');
  });

  test.each(modules())('%s/actions.ts reads no derived state', (module) => {
    let source: string;
    try {
      source = readFileSync(join(OVERMIND, module, 'actions.ts'), 'utf8');
    } catch {
      return; // not every module has actions
    }
    // `state.<module>.<derived>` — the shape a read takes. Anything else named
    // the same (an options key, a local) is not a state read.
    const pattern = new RegExp(`\\bstate\\.\\w+\\.(${allDerived.join('|')})\\b`, 'g');
    const found = [...withoutComments(source).matchAll(pattern)].map((match) => match[0]);
    expect(found).toEqual([]);
  });
});
