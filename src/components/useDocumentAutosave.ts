import { useEffect, useRef } from 'react';
import { json } from 'overmind';
import { useActions, useAppState } from '../overmind';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { undoBuffer } from '../overmind/undo/UndoBuffer';
import { overlayCanvasController } from '../canvas/overlayCanvas/OverlayCanvasController';
import { setPendingCanvasContent } from '../canvas/pendingCanvasContent';
import { CanvasColorIndex } from '../domain/CanvasColorIndex';
import { ScreenFormatId, VideoStandard } from '../overmind/canvas/state';
import {
  DocumentRecord,
  finishRestore,
  loadDocument,
  saveDocument,
} from '../persistence/documentAutosave';

// How long after a committed stroke the picture is written, so a flurry of
// quick strokes writes once rather than a dozen times.
const WRITE_IDLE_MS = 400;
// ...and the longest a change may sit unwritten however fast they keep coming.
// Without this the timer restarted on every stroke, so painting steadily wrote
// nothing at all until the pointer rested — losing not the last moment's work
// but all of it. This bounds what a reload can cost, whatever you are doing.
const WRITE_MAX_WAIT_MS = 1500;

// Reopening the app puts the picture back where it was left, and keeps it there
// as it changes. Deliberately silent: no dialog asks whether to restore, since
// "discard" is the irreversible answer and it would be asked before the user
// has seen anything (docs/local/undo-memory.md, part 4 "Restore UX").
//
// Only the picture, never the undo history — see DocumentRecord.
export function useDocumentAutosave(): void {
  const state = useAppState();
  const actions = useActions();
  // StrictMode mounts twice in development, and a second restore would fight
  // the first over the canvas.
  const restored = useRef(false);
  // When the oldest unwritten change happened, or null when everything is
  // written. Drives the maximum wait below.
  const pendingSince = useRef<number | null>(null);

  useEffect((): void => {
    if (restored.current) {
      return;
    }
    restored.current = true;
    void (async (): Promise<void> => {
      const record = await loadDocument();
      if (!record) {
        return;
      }
      applyDocument(record);
      finishRestore();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyDocument = (record: DocumentRecord): void => {
    // Through the actions, in dependency order, exactly as an image load does:
    // the palette has to reach the GL textures before the pixels that index
    // into it, and the resolution effect uploads the raster after the canvas
    // element has resized. Assigning to state directly would skip all of that.
    actions.canvas.setTrueColorEnabled(record.trueColorEnabled);
    actions.palette.replacePalette(record.palette);
    actions.palette.replaceRanges(record.ranges);
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();
    actions.canvas.setScreenFormat({ formatId: record.screenFormatId as ScreenFormatId | null });
    actions.canvas.setVideoStandard(record.videoStandard as VideoStandard);
    setPendingCanvasContent(
      new CanvasColorIndex(record.width, record.height, record.pixels),
      // freshDocument: the restored picture is the document, and the history of
      // how it got there is not being restored with it
      { freshDocument: true, documentName: record.documentName, documentModified: record.modified }
    );
    actions.canvas.setResolution({
      width: record.width,
      height: record.height,
      recordUndoPoint: false,
    });
  };

  // Every committed change moves this, which is exactly when the saved copy has
  // gone stale — the same signal the tab title's marker reads.
  const changedAt = state.undo.lastUndoPointTime;
  // And this moves when the picture starts or stops matching a file. Writing a
  // record is the only way that fact reaches the next visit, and a save changes
  // it without touching the pixels — so a record written before the save would
  // otherwise keep saying "unsaved" forever, and come back with an asterisk it
  // no longer deserves.
  const cleanAt = state.app.lastCleanTime;
  // Nothing is written for a canvas nobody has touched: the startup baseline
  // would otherwise save a blank picture at this window's size, and restore it
  // into a differently sized window next time, in place of the fresh canvas
  // that window should get.
  const worthSaving = state.undo.bufferEntryCount > 1 || state.app.documentName !== '';

  // The write itself, kept in a ref so the timer and the page-is-going-away
  // listeners always call the current one rather than the closure they were
  // registered with.
  const writeNow = useRef<() => void>(() => undefined);
  writeNow.current = (): void => {
    pendingSince.current = null;
    if (!restored.current || !worthSaving) {
      return;
    }
    // The committed raster from the undo buffer, not a fresh read of the
    // canvas. setUndoPoint has just put exactly these pixels there, so reading
    // the canvas again would repeat a full-canvas GPU readback for nothing —
    // and the timer can fire after the next stroke has begun, which would
    // capture it half-drawn and stall the drag by the length of that readback
    // (tens of milliseconds on a large canvas).
    const colorIndex = undoBuffer.getItem(state.undo.currentIndex)?.colorIndex;
    if (!colorIndex) {
      return;
    }
    void saveDocument({
      version: 1,
      width: colorIndex.width,
      height: colorIndex.height,
      // A copy, not the live view: the snapshot this came from is also the
      // undo buffer's, and handing the same buffer to a structured clone
      // while the app may still write to it is asking for a torn record.
      pixels: new Uint8Array(colorIndex.indexArray),
      // json() unwraps Overmind's proxies — a proxy cannot be structure-cloned
      palette: json(state.palette.paletteArray),
      ranges: json(state.palette.ranges),
      screenFormatId: state.canvas.screenFormatId,
      videoStandard: state.canvas.videoStandard,
      trueColorEnabled: state.canvas.trueColorEnabled,
      documentName: state.app.documentName,
      // as the tab title computes it — see useDocumentTitle
      modified: changedAt > cleanAt,
    });
  };

  useEffect((): (() => void) | void => {
    if (!restored.current || !worthSaving || changedAt === 0) {
      return;
    }
    if (pendingSince.current === null) {
      pendingSince.current = Date.now();
    }
    // Idle delay, but never past the maximum wait measured from the first
    // change still unwritten.
    const waited = Date.now() - pendingSince.current;
    const delay = Math.max(0, Math.min(WRITE_IDLE_MS, WRITE_MAX_WAIT_MS - waited));
    const timer = window.setTimeout((): void => writeNow.current(), delay);
    return (): void => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedAt, cleanAt, worthSaving]);

  // Closing, reloading or switching away is the last chance to write, so the
  // pending change goes out then rather than waiting for a timer that will not
  // fire. Best effort: the browser may tear the page down before IndexedDB
  // finishes, which is why the delays above are short enough to stand on their
  // own — this narrows the window rather than being relied on to close it.
  useEffect((): (() => void) => {
    const flush = (): void => {
      if (pendingSince.current !== null) {
        writeNow.current();
      }
    };
    const onHidden = (): void => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);
    return (): void => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, []);
}
