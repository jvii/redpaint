// ByteRun1 run-length coding (the ILBM spec's compression = 1; the same
// scheme as Mac PackBits). Control byte n as signed: 0..127 copy the next
// n+1 bytes literally; -1..-127 repeat the next byte 1-n times; -128 no-op.

export function unpackByteRun1(src: Uint8Array, unpackedLength: number): Uint8Array {
  const out = new Uint8Array(unpackedLength);
  let s = 0;
  let d = 0;
  while (d < unpackedLength && s < src.length) {
    const n = (src[s++] << 24) >> 24; // sign-extend the control byte
    if (n >= 0) {
      for (let i = 0; i <= n && s < src.length && d < unpackedLength; i++) {
        out[d++] = src[s++];
      }
    } else if (n !== -128) {
      const value = src[s++];
      for (let i = 0; i < 1 - n && d < unpackedLength; i++) {
        out[d++] = value;
      }
    }
  }
  if (d < unpackedLength) {
    throw new Error('Truncated ByteRun1 data');
  }
  return out;
}

export function packByteRun1(src: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < src.length) {
    // measure the run of equal bytes starting here (capped at 128)
    let runEnd = i + 1;
    while (runEnd < src.length && runEnd - i < 128 && src[runEnd] === src[i]) {
      runEnd++;
    }
    if (runEnd - i >= 3) {
      out.push(257 - (runEnd - i), src[i]); // -(runLength-1) as an unsigned byte
      i = runEnd;
      continue;
    }
    // literal block: until a run of 3+ starts, or 128 bytes
    let litEnd = i + 1;
    while (
      litEnd < src.length &&
      litEnd - i < 128 &&
      !(litEnd + 2 < src.length && src[litEnd] === src[litEnd + 1] && src[litEnd] === src[litEnd + 2])
    ) {
      litEnd++;
    }
    out.push(litEnd - i - 1);
    for (let j = i; j < litEnd; j++) {
      out.push(src[j]);
    }
    i = litEnd;
  }
  return new Uint8Array(out);
}
