import { BlobMaker } from './saveFormats';

// PNG in both directions: the one bitmap format every OS clipboard and every
// browser agree on.
const PNG_TYPE = 'image/png';

export function canWriteImageToClipboard(): boolean {
  return typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write !== undefined;
}

export function canReadImageFromClipboard(): boolean {
  return navigator.clipboard?.read !== undefined;
}

// The ClipboardItem is handed the unresolved promise rather than an awaited
// blob. Awaiting first spends the click's transient activation, and Safari
// then rejects the write.
export async function writeImageToClipboard(makeBlob: BlobMaker): Promise<boolean> {
  if (!canWriteImageToClipboard()) {
    return false;
  }
  try {
    const blob = makeBlob().then((made): Blob => {
      if (!made) {
        throw new Error('nothing to copy');
      }
      return made;
    });
    await navigator.clipboard.write([new ClipboardItem({ [PNG_TYPE]: blob })]);
    return true;
  } catch {
    return false;
  }
}

// What the two Paste gadgets want: a URL for whichever loader they feed, or
// null if there was no picture to be had. The loaders revoke it themselves.
export async function clipboardImageUrl(): Promise<string | null> {
  const blob = await readImageFromClipboard();
  return blob ? URL.createObjectURL(blob) : null;
}

// Null covers every way this ends without an image: permission refused, the
// clipboard holding text, or no clipboard read at all. The caller cannot tell
// them apart and does not need to — all three mean the same thing on screen.
export async function readImageFromClipboard(): Promise<Blob | null> {
  if (!canReadImageFromClipboard()) {
    return null;
  }
  try {
    for (const item of await navigator.clipboard.read()) {
      const type = item.types.find((candidate): boolean => candidate.startsWith('image/'));
      if (type) {
        return await item.getType(type);
      }
    }
  } catch {
    return null;
  }
  return null;
}
