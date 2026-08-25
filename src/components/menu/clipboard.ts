import { BlobMaker } from './saveFormats';

// The one bitmap format every OS clipboard and every browser agree on.
const PNG_TYPE = 'image/png';

export function canWriteImageToClipboard(): boolean {
  return typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write !== undefined;
}

export function canReadImageFromClipboard(): boolean {
  return navigator.clipboard?.read !== undefined;
}

// The ClipboardItem takes the unresolved promise: awaiting first spends the
// click's transient activation, and Safari then rejects the write.
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

// The loader the caller feeds this to revokes it.
export async function clipboardImageUrl(): Promise<string | null> {
  const blob = await readImageFromClipboard();
  return blob ? URL.createObjectURL(blob) : null;
}

// A refused permission is not distinguished from an empty clipboard: both
// mean the same thing on screen.
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
