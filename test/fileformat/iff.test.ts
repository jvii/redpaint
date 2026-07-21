import { describe, expect, test } from 'vitest';
import { readForm, writeForm, IffChunk } from '../../src/fileformat/iff';

function ascii(s: string): number[] {
  return [...s].map((c) => c.charCodeAt(0));
}

describe('readForm', () => {
  test('parses a FORM with two chunks, honoring even padding', () => {
    // FORM size 26: 'TEST' + chunk 'AAAA' (3 bytes data + 1 pad) + chunk 'BBBB' (2 bytes)
    const bytes = new Uint8Array([
      ...ascii('FORM'), 0, 0, 0, 26,
      ...ascii('TEST'),
      ...ascii('AAAA'), 0, 0, 0, 3, 1, 2, 3, 0, // odd size -> pad byte
      ...ascii('BBBB'), 0, 0, 0, 2, 9, 8,
    ]);
    const form = readForm(bytes);
    expect(form.formType).toBe('TEST');
    expect(form.chunks).toHaveLength(2);
    expect(form.chunks[0].id).toBe('AAAA');
    expect([...form.chunks[0].data]).toEqual([1, 2, 3]);
    expect(form.chunks[1].id).toBe('BBBB');
    expect([...form.chunks[1].data]).toEqual([9, 8]);
  });

  test('throws on a non-IFF file', () => {
    expect(() => readForm(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toThrow();
    expect(() => readForm(new Uint8Array(ascii('FORM')))).toThrow(); // too short
  });

  test('clamps a chunk whose stored size overruns the file instead of throwing', () => {
    // some vintage IFF writers recorded a bogus (too-large) size for their
    // final chunk — seen in the wild on ByteRun1-compressed BODY chunks
    // (confirmed against real samples: P01504.lbm, PLAYCAAD, teapot2.lbm).
    // Reading should still succeed, with the chunk's data clamped to
    // whatever bytes are actually present.
    const bytes = new Uint8Array([
      ...ascii('FORM'), 0, 0, 0, 16,
      ...ascii('TEST'),
      ...ascii('AAAA'), 0, 0, 0, 99, 1, 2, 3, 4,
    ]);
    const form = readForm(bytes);
    expect(form.chunks).toHaveLength(1);
    expect(form.chunks[0].id).toBe('AAAA');
    expect([...form.chunks[0].data]).toEqual([1, 2, 3, 4]);
  });

  test('stops after clamping an overrunning chunk, ignoring anything past it', () => {
    // a well-formed chunk following an overrunning one is unreachable —
    // there's no trustworthy size to skip past the bad chunk with
    const bytes = new Uint8Array([
      ...ascii('FORM'), 0, 0, 0, 26,
      ...ascii('TEST'),
      ...ascii('AAAA'), 0, 0, 0, 99, 1, 2, 3, 4,
      ...ascii('BBBB'), 0, 0, 0, 2, 9, 8,
    ]);
    const form = readForm(bytes);
    expect(form.chunks.map((c) => c.id)).toEqual(['AAAA']);
  });
});

describe('writeForm', () => {
  test('round-trips through readForm, padding odd chunks', () => {
    const chunks: IffChunk[] = [
      { id: 'AAAA', data: new Uint8Array([1, 2, 3]) },
      { id: 'BBBB', data: new Uint8Array([9, 8]) },
    ];
    const bytes = writeForm('TEST', chunks);
    expect(bytes.length % 2).toBe(0);
    const form = readForm(bytes);
    expect(form.formType).toBe('TEST');
    expect(form.chunks.map((c) => c.id)).toEqual(['AAAA', 'BBBB']);
    expect([...form.chunks[0].data]).toEqual([1, 2, 3]);
  });
});
