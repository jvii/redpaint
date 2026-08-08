// How a keyboard shortcut is written on a keycap.
//
// The app's own bindings are case-sensitive and use DPaint's reference-card
// convention, where the letter's case *is* the shift state: `h` halves the
// brush and `H` doubles it. That is exact and it is what the docs use, but a
// cap is not a reference card — a lone `H` shows a key that exists on the
// keyboard, so it reads as "press H" and gives the reader no reason to think a
// modifier is involved. Spelling the chord out is the difference between a cap
// that can be obeyed and one that can be misread.
//
// The letter is always uppercased, shifted or not, because that is what is on
// the key: no keyboard has a lowercase `r` engraved on it, so a cap reading `r`
// names a key the reader cannot find. The shift state is carried by the ⇧ and
// nothing else — `R` and `⇧R` — which is how every OS writes a shortcut, and
// the only way to be legible without being ambiguous.
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
