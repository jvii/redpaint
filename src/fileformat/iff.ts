// IFF-85 container (EA 1985) reading/writing — the envelope around ILBM and
// friends. Big-endian throughout; every chunk is padded to an even length
// (the pad byte is not counted in the chunk's stored size). This layer knows
// nothing about what the chunks mean.

export interface IffChunk {
  id: string; // 4 ASCII characters
  data: Uint8Array; // chunk contents, without the pad byte
}

export interface IffForm {
  formType: string; // e.g. 'ILBM', 'PBM '
  chunks: IffChunk[];
}

export function readForm(bytes: Uint8Array): IffForm {
  if (bytes.length < 12 || readId(bytes, 0) !== 'FORM') {
    throw new Error('Not an IFF file (missing FORM header)');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const formSize = view.getUint32(4); // bytes after the size field: formType + chunks
  const formType = readId(bytes, 8);
  const end = Math.min(8 + formSize, bytes.length);

  const chunks: IffChunk[] = [];
  let offset = 12;
  while (offset + 8 <= end) {
    const id = readId(bytes, offset);
    const size = view.getUint32(offset + 4);
    if (offset + 8 + size > bytes.length) {
      // Some vintage writers recorded a bogus (too-large) size for their
      // final chunk — seen in the wild on ByteRun1-compressed BODY chunks,
      // where the size looks like it was computed from the uncompressed
      // length instead of the packed one. Rather than reject the file,
      // clamp to whatever bytes are actually there and stop: a chunk
      // reader (e.g. ByteRun1) only consumes as many bytes as it needs to
      // reconstruct the known content, so a "short" chunk still decodes
      // fully, and there's no reliable way to locate a next chunk without
      // a trustworthy size.
      chunks.push({ id, data: bytes.subarray(offset + 8, bytes.length) });
      break;
    }
    chunks.push({ id, data: bytes.subarray(offset + 8, offset + 8 + size) });
    offset += 8 + size + (size & 1); // skip the pad byte after odd-sized chunks
  }
  return { formType, chunks };
}

export function writeForm(formType: string, chunks: IffChunk[]): Uint8Array {
  const parts = chunks.map(writeChunk);
  const contentSize = 4 + parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(8 + contentSize);
  writeId(out, 0, 'FORM');
  new DataView(out.buffer).setUint32(4, contentSize);
  writeId(out, 8, formType);
  let offset = 12;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function writeChunk(chunk: IffChunk): Uint8Array {
  const size = chunk.data.length;
  const out = new Uint8Array(8 + size + (size & 1)); // trailing pad byte if odd
  writeId(out, 0, chunk.id);
  new DataView(out.buffer).setUint32(4, size);
  out.set(chunk.data, 8);
  return out;
}

function readId(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

function writeId(bytes: Uint8Array, offset: number, id: string): void {
  for (let i = 0; i < 4; i++) {
    bytes[offset + i] = id.charCodeAt(i);
  }
}
