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

  test('throws on a chunk whose stored size overruns the file', () => {
    const bytes = new Uint8Array([
      ...ascii('FORM'), 0, 0, 0, 16,
      ...ascii('TEST'),
      ...ascii('AAAA'), 0, 0, 0, 99, 1, 2, 3, 4,
    ]);
    expect(() => readForm(bytes)).toThrow(/truncated/i);
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
