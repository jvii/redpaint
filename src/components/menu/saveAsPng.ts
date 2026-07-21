interface SaveFileType {
  description: string;
  mime: string;
  extension: string;
}

// Saves a blob to a file. Asks for the save location first, while the user
// gesture is still fresh (transient activation can expire across async work).
// showSaveFilePicker is Chromium only — other browsers fall back to a regular
// download.
export async function saveFile(
  makeBlob: () => Promise<Blob | null>,
  suggestedName: string,
  fileType: SaveFileType
): Promise<void> {
  type SaveFilePicker = (options?: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{ createWritable: () => Promise<WritableStream> }>;
  const showSaveFilePicker = (window as { showSaveFilePicker?: SaveFilePicker })
    .showSaveFilePicker;

  let fileHandle = null;
  if (showSaveFilePicker) {
    try {
      fileHandle = await showSaveFilePicker({
        suggestedName,
        types: [
          { description: fileType.description, accept: { [fileType.mime]: [fileType.extension] } },
        ],
      });
    } catch {
      return; // user cancelled the picker
    }
  }

  const blob = await makeBlob();
  if (!blob) {
    return;
  }

  if (fileHandle) {
    const writable = await fileHandle.createWritable();
    const writer = writable.getWriter();
    await writer.write(blob);
    await writer.close();
    return;
  }

  // fallback: regular browser download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout((): void => URL.revokeObjectURL(url), 1000);
}

export async function saveCanvasAsPng(
  canvas: HTMLCanvasElement,
  suggestedName: string
): Promise<void> {
  await saveFile(
    () => new Promise((resolve): void => canvas.toBlob(resolve, 'image/png')),
    suggestedName,
    { description: 'PNG image', mime: 'image/png', extension: '.png' }
  );
}
