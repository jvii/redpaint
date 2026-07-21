import { describe, expect, test } from 'vitest';
import { packByteRun1, unpackByteRun1 } from '../../src/fileformat/byteRun1';

describe('unpackByteRun1', () => {
  test('decodes literal runs (n >= 0: copy n+1 bytes)', () => {
    expect([...unpackByteRun1(new Uint8Array([2, 10, 20, 30]), 3)]).toEqual([10, 20, 30]);
  });

  test('decodes replicate runs (n < 0: repeat next byte 1-n times)', () => {
    // -3 as unsigned byte is 253 -> repeat 4 times
    expect([...unpackByteRun1(new Uint8Array([253, 7]), 4)]).toEqual([7, 7, 7, 7]);
  });

  test('skips the -128 no-op code', () => {
    expect([...unpackByteRun1(new Uint8Array([128, 0, 5]), 1)]).toEqual([5]);
  });

  test('decodes mixed literal and replicate runs', () => {
    // [1, 2] literal, then 3x9
    const packed = new Uint8Array([1, 1, 2, 254, 9]);
    expect([...unpackByteRun1(packed, 5)]).toEqual([1, 2, 9, 9, 9]);
  });

  test('throws when the stream ends before unpackedLength is reached', () => {
    expect(() => unpackByteRun1(new Uint8Array([2, 10, 20]), 5)).toThrow(/truncated/i);
  });
});

describe('packByteRun1', () => {
  test('packs a run of equal bytes as a replicate', () => {
    expect([...packByteRun1(new Uint8Array([7, 7, 7, 7]))]).toEqual([253, 7]);
  });

  test('packs distinct bytes as a literal', () => {
    expect([...packByteRun1(new Uint8Array([1, 2, 3]))]).toEqual([2, 1, 2, 3]);
  });

  test('round-trips arbitrary data, including runs longer than 128', () => {
    const data = new Uint8Array(1000);
    for (let i = 0; i < data.length; i++) {
      data[i] = i < 300 ? 42 : (i * 31) & 0xff; // long run, then noise
    }
    const packed = packByteRun1(data);
    expect([...unpackByteRun1(packed, data.length)]).toEqual([...data]);
    expect(packed.length).toBeLessThan(data.length);
  });

  test('round-trips the empty array', () => {
    expect(packByteRun1(new Uint8Array(0)).length).toBe(0);
    expect(unpackByteRun1(new Uint8Array(0), 0).length).toBe(0);
  });
});
