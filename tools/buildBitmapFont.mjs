// Converts a bitmap font into the small runtime asset the text tool loads.
//
//   node tools/buildBitmapFont.mjs <in.hex|in.raw> <out.rpbf> [--baseline N]
//
// Input is either Unifont/unscii `.hex` (`codepoint:hexbitmap` per line) or a
// headerless `.raw` of 256 fixed-size cells (what rewtnull/amigafonts ships).
// Only printable ASCII is kept: that is everything the text tool can type, and
// a full Unicode range would be a hundred times the bytes for nothing.
//
// Output is deliberately a **separate binary asset under public/fonts/**, not a
// generated TypeScript module. Vite would inline a module into the app bundle,
// and a bundled artifact is a much weaker "mere aggregation" argument for any
// face that is not public domain — Topaz and the other Amiga conversions are
// GPL with the font exception, which covers the pictures a user paints but not
// an app that compiles the font into itself. Keeping every face a fetched file
// means a GPL one can be dropped in beside a public-domain one without the two
// licences ever meeting inside a build artifact.

import { readFileSync, writeFileSync } from 'fs';

const FIRST_CODE = 0x20;
const LAST_CODE = 0x7e;

// Glyphs that reach the baseline and never below it, so the lowest row any of
// them inks is the row above the baseline. Used to guess the baseline when the
// caller does not give one; a bitmap font carries no metrics of its own.
const BASELINE_REFERENCE = 'HXEIonvwz';

function parseHex(text) {
  const glyphs = new Map();
  let cellHeight = 0;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || !trimmed.includes(':')) {
      continue;
    }
    const [code, bitmap] = trimmed.split(':');
    // Two hex digits per byte, one byte per row while the cell is <= 8 wide.
    // Wider cells (a double-width glyph) take two bytes a row; none of
    // printable ASCII does, so they are skipped rather than supported.
    if (bitmap.length % 2 !== 0) {
      continue;
    }
    const rows = [];
    for (let i = 0; i < bitmap.length; i += 2) {
      rows.push(parseInt(bitmap.slice(i, i + 2), 16));
    }
    const point = parseInt(code, 16);
    if (point < FIRST_CODE || point > LAST_CODE) {
      continue;
    }
    glyphs.set(point, rows);
    cellHeight = Math.max(cellHeight, rows.length);
  }
  return { glyphs, cellWidth: 8, cellHeight };
}

function parseRaw(buffer) {
  // 256 cells, one byte per row, so the file's size gives the cell height.
  const cellHeight = buffer.length / 256;
  if (!Number.isInteger(cellHeight)) {
    throw new Error(`raw font is not 256 cells of whole bytes (${buffer.length} bytes)`);
  }
  const glyphs = new Map();
  for (let code = FIRST_CODE; code <= LAST_CODE; code++) {
    glyphs.set(code, Array.from(buffer.subarray(code * cellHeight, (code + 1) * cellHeight)));
  }
  return { glyphs, cellWidth: 8, cellHeight };
}

function guessBaseline(glyphs, cellHeight) {
  let lowest = -1;
  for (const character of BASELINE_REFERENCE) {
    const rows = glyphs.get(character.charCodeAt(0));
    if (!rows) {
      continue;
    }
    for (let y = 0; y < rows.length; y++) {
      if (rows[y] !== 0) {
        lowest = Math.max(lowest, y);
      }
    }
  }
  // The baseline sits one row under the lowest inked row of a non-descending
  // glyph. Falls back to the whole cell if no reference glyph was found.
  return lowest >= 0 ? lowest + 1 : cellHeight;
}

// 'RPBF', version, cellWidth, cellHeight, baseline, firstCode, glyphCount,
// then one byte per glyph row. v1 is monospaced: the advance is the cell width,
// which every classic system font here is.
const HEADER_BYTES = 12;

function encode({ glyphs, cellWidth, cellHeight }, baseline) {
  const count = LAST_CODE - FIRST_CODE + 1;
  const out = Buffer.alloc(HEADER_BYTES + count * cellHeight);
  out.write('RPBF', 0, 'ascii');
  out.writeUInt8(1, 4);
  out.writeUInt8(cellWidth, 5);
  out.writeUInt8(cellHeight, 6);
  out.writeUInt8(baseline, 7);
  out.writeUInt16LE(FIRST_CODE, 8);
  out.writeUInt16LE(count, 10);

  for (let code = FIRST_CODE; code <= LAST_CODE; code++) {
    const rows = glyphs.get(code) ?? [];
    const base = HEADER_BYTES + (code - FIRST_CODE) * cellHeight;
    for (let y = 0; y < cellHeight; y++) {
      out.writeUInt8(rows[y] ?? 0, base + y);
    }
  }
  return out;
}

const [input, output, ...rest] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: node tools/buildBitmapFont.mjs <in.hex|in.raw> <out.rpbf> [--baseline N]');
  process.exit(1);
}

const raw = readFileSync(input);
const parsed = input.endsWith('.hex') ? parseHex(raw.toString('utf8')) : parseRaw(raw);

const override = rest.indexOf('--baseline');
const baseline = override >= 0 ? Number(rest[override + 1]) : guessBaseline(parsed.glyphs, parsed.cellHeight);

const missing = [];
for (let code = FIRST_CODE; code <= LAST_CODE; code++) {
  if (!parsed.glyphs.has(code)) {
    missing.push(String.fromCharCode(code));
  }
}

writeFileSync(output, encode(parsed, baseline));
console.log(
  `${output}: ${parsed.cellWidth}x${parsed.cellHeight}, baseline ${baseline}, ` +
    `${LAST_CODE - FIRST_CODE + 1 - missing.length}/95 glyphs` +
    (missing.length ? `, missing: ${missing.join('')}` : '')
);
