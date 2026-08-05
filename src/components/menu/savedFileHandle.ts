import { SaveFileHandle } from './saveAsPng';

// The file the picture was last written to, per format, kept outside Overmind
// like pendingImage and brushRecall: a FileSystemFileHandle is a live browser
// object, not state, and nothing renders from it.
//
// Per format because the two saves write different files — after Save As on
// harbour.png and then Save As on harbour.iff, a plain Save of each must go
// back to its own file rather than to whichever was written last.
//
// Only Chromium fills these in. On the download branch there is no handle to
// keep, which is exactly why repeat saves there are numbered by the browser.
export type SaveFormat = 'png' | 'iff';

const handles: { [format in SaveFormat]?: SaveFileHandle } = {};

export function rememberFileHandle(format: SaveFormat, handle: SaveFileHandle | null): void {
  if (handle) {
    handles[format] = handle;
  } else {
    delete handles[format];
  }
}

export function fileHandleFor(format: SaveFormat): SaveFileHandle | undefined {
  return handles[format];
}

// A new document is not the file the old one was written to.
export function forgetFileHandles(): void {
  delete handles.png;
  delete handles.iff;
}
