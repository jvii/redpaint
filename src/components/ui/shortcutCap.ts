// How a keyboard shortcut is written on a keycap.
//
// The app's bindings are case-sensitive, DPaint's reference-card convention
// where the letter's case *is* the shift state: `h` halves the brush and `H`
// doubles it. A cap is not a reference card, though — a lone `H` reads as
// "press H" and gives no sign a modifier is involved.
//
// So the letter is always uppercased, because that is what is engraved on the
// key, and the shift state is carried by the ⇧ and nothing else: `R` and `⇧R`,
// the way every OS writes a shortcut.
//
// Chords that already name their modifiers (⌘Z, Ctrl+Shift+Z) and non-letters
// (/ , >) pass through as written.
export function shortcutCap(key: string): string {
  if (key.length !== 1) {
    return key;
  }
  if (key >= 'A' && key <= 'Z') {
    return `⇧${key}`;
  }
  if (key >= 'a' && key <= 'z') {
    return key.toUpperCase();
  }
  return key;
}
