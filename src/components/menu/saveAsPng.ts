export interface SaveFileType {
  description: string;
  mime: string;
  extension: string;
}

// Asks the user what to call the file, for the branch that has no native save
// picker to ask for us. Resolves to the chosen base name, or null if cancelled.
// A callback rather than a direct call, so this module stays free of React and
// Overmind — the requester lives in the component layer where it belongs.
export type PromptForName = (suggested: string) => Promise<string | null>;

// A handle to the file the picker wrote, kept so a later save can write to it
// again — same file, no dialog, no numbered duplicate. Only Chromium's
// showSaveFilePicker produces one; the download branch has no equivalent,
// which is the whole reason repeat saves are numbered there.
export type SaveFileHandle = {
  name: string;
  createWritable: () => Promise<WritableStream>;
  queryPermission?: (options: { mode: string }) => Promise<PermissionState>;
  requestPermission?: (options: { mode: string }) => Promise<PermissionState>;
};

// Where a save ended up: the base name it was given, and the handle to write to
// next time if the browser gave us one.
export type SaveTarget = { name: string; handle: SaveFileHandle | null };

// Everything a file name may not contain, plus leading dots (a name starting
// with one is hidden on every unix, and "..." is nothing at all). Browsers
// sanitize the download attribute themselves, but silently and differently, so
// the name shown in the requester would stop matching the name on disk.
//
// Order matters, and it has to be idempotent: the requester sanitizes to build
// its preview and saveFile sanitizes again on the way out, so a function whose
// second pass differs from its first makes the preview a lie. Stripping the
// dots before removing the slashes did exactly that — "../bad:name?" came out
// as "..badname" once (the dots were not leading yet, the spaces were) and
// "badname" twice. Trim, then remove, then strip, and both passes agree.
export function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/^\.+/, '');
}

// Appends the format's extension unless it is already there — so "mypic"
// becomes "mypic.png" and "mypic.png" is left alone rather than becoming
// "mypic.png.png".
export function withExtension(name: string, extension: string): string {
  return name.toLowerCase().endsWith(extension.toLowerCase()) ? name : name + extension;
}

// Saves a blob to a file, by whichever route the browser offers.
//
// Chromium has showSaveFilePicker, which asks for the location and the name at
// once; it is called before makeBlob so the user gesture is still fresh
// (transient activation can expire across async work). Everywhere else the file
// goes to the downloads folder under a name we have to supply ourselves — so
// promptForName is asked for one, and only on that branch. Without it, every
// save on Firefox and Safari lands under the same default name.
//
// The activation concern inverts on that branch, in our favour: the requester's
// own OK click is a fresh gesture, so the download that follows has newer
// activation than the picker path does.
//
// Returns the base name it wrote, without the extension, or null if nothing was
// written — every early return here is a cancel or a failure, and neither should
// clear the tab title's unsaved marker or rename the document.
//
// The name has to come back from here because only this function knows it: on
// the picker branch the user typed it into an OS dialog, and the returned handle
// is the only place it appears.
// Whether this browser has a save picker of its own. The dialog asks so it can
// leave the name to the picker rather than asking twice; saveFileAs asks so it
// knows which branch it is taking. One definition, so the two cannot disagree
// about it and leave a save with nobody having asked for a name.
type SaveFilePicker = (options?: {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}) => Promise<SaveFileHandle>;

function saveFilePicker(): SaveFilePicker | undefined {
  return (window as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
}

export function hasSaveFilePicker(): boolean {
  return saveFilePicker() !== undefined;
}

export async function saveFileAs(
  makeBlob: () => Promise<Blob | null>,
  suggestedName: string,
  fileType: SaveFileType,
  promptForName?: PromptForName
): Promise<SaveTarget | null> {
  const showSaveFilePicker = saveFilePicker();

  let fileHandle: SaveFileHandle | null = null;
  let downloadName = suggestedName;
  if (showSaveFilePicker) {
    try {
      fileHandle = await showSaveFilePicker({
        suggestedName,
        types: [
          { description: fileType.description, accept: { [fileType.mime]: [fileType.extension] } },
        ],
      });
    } catch {
      return null; // user cancelled the picker
    }
  } else if (promptForName) {
    const chosen = await promptForName(suggestedName);
    if (chosen === null) {
      return null; // user cancelled the requester
    }
    // The requester sanitizes as it previews, so this is belt and braces —
    // idempotent, and the one thing standing between a hand-written
    // promptForName and a name the browser would quietly rewrite.
    const cleaned = sanitizeFileName(chosen);
    downloadName = withExtension(cleaned === '' ? suggestedName : cleaned, fileType.extension);
  }

  const blob = await makeBlob();
  if (!blob) {
    return null;
  }

  if (fileHandle) {
    const writable = await fileHandle.createWritable();
    const writer = writable.getWriter();
    await writer.write(blob);
    await writer.close();
    // What the user actually called it in the OS dialog, which may be nothing
    // like what was suggested — and the handle itself, so the next save can go
    // straight back to this file.
    return { name: baseName(fileHandle.name, fileType.extension), handle: fileHandle };
  }

  // fallback: regular browser download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout((): void => URL.revokeObjectURL(url), 1000);
  // No handle: a download is fire-and-forget, and the page never learns where
  // it landed or gets to write there again.
  return { name: baseName(downloadName, fileType.extension), handle: null };
}

// Writes to a file already chosen, with no dialog of any kind — the "Save" half
// of Save/Save As, and the only way to overwrite rather than accumulate
// numbered copies. Returns false if the handle has gone stale (the file moved
// or deleted, or permission lapsed after a reload), which the caller answers by
// asking again.
export async function writeToHandle(
  handle: SaveFileHandle,
  makeBlob: () => Promise<Blob | null>
): Promise<boolean> {
  try {
    // Granted at pick time and kept for the session, so this is normally a
    // formality — but a handle restored later needs asking again, and that has
    // to happen inside the click that triggered the save.
    if (
      handle.queryPermission &&
      (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted'
    ) {
      if (
        !handle.requestPermission ||
        (await handle.requestPermission({ mode: 'readwrite' })) !== 'granted'
      ) {
        return false;
      }
    }
    const blob = await makeBlob();
    if (!blob) {
      return false;
    }
    const writable = await handle.createWritable();
    const writer = writable.getWriter();
    await writer.write(blob);
    await writer.close();
    return true;
  } catch {
    return false;
  }
}

// Strips the format's extension, so what comes back is a name that can be
// offered to any format's save rather than one carrying another's suffix.
function baseName(name: string, extension: string): string {
  return name.toLowerCase().endsWith(extension.toLowerCase())
    ? name.slice(0, -extension.length)
    : name;
}

export const PNG_FILE_TYPE: SaveFileType = {
  description: 'PNG image',
  mime: 'image/png',
  extension: '.png',
};

export function canvasPngBlob(canvas: HTMLCanvasElement): () => Promise<Blob | null> {
  return () => new Promise((resolve): void => canvas.toBlob(resolve, 'image/png'));
}

export async function saveCanvasAsPng(
  canvas: HTMLCanvasElement,
  suggestedName: string,
  promptForName?: PromptForName
): Promise<SaveTarget | null> {
  return saveFileAs(canvasPngBlob(canvas), suggestedName, PNG_FILE_TYPE, promptForName);
}
