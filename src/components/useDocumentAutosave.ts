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

// The shortest gap between two writes, so a flurry of quick strokes writes
// once rather than a dozen times. It is a gap between writes and not a delay
// before one: the first change after things have settled goes out immediately,
// and only the ones crowding in behind it wait.
//
// It used to be a plain delay, which meant a 400ms window after every stroke
// where the work was not saved anywhere — and "paint one stroke, refresh" is
// precisely the sequence someone performs while trying the app out, so that
// window was hit far more often than its length suggests. The pagehide flush
// cannot cover it: the browser tears the document down before IndexedDB
// commits, whatever the write does.
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
  // When the last write went out, so the gap between writes can be honored
  // without delaying a change that is not crowding another.
  const lastWriteAt = useRef(0);

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
      record.packed
        ? CanvasColorIndex.fromIndexedPixels(record.width, record.height, record.pixels)
        : new CanvasColorIndex(record.width, record.height, record.pixels),
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

  // When the picture last became something other than what is saved — a stroke
  // appends an entry, while an undo or redo steps to a different one without
  // appending anything, and both leave the record stale.
  //
  // Watching only the stroke timestamp was wrong twice over. Undo and redo
  // never triggered a write, so the record kept a picture the canvas no longer
  // showed; and because the write is deferred and reads whichever entry is
  // current when it fires, undoing inside that delay made a pending write save
  // the entry it had stepped *back* to.
  //
  // The raw timestamps rather than app.documentModified, because these are what
  // schedule the write: a second stroke has to restart the timer even though
  // the document was already modified before it and still is after.
  const changedAt = Math.max(state.undo.lastUndoPointTime, state.undo.lastUndoRedoTime);
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
  // registered with. Refreshed in an effect rather than assigned during render:
  // a render that never commits must not leave its closure behind for a
  // listener registered by one that did.
  //
  // No dependency array, so it is refreshed after every commit — and declared
  // above the effects that call it, so they only ever schedule against a
  // closure this render has already installed.
  const writeNow = useRef<() => void>(() => undefined);
  useEffect((): void => {
    writeNow.current = (): void => {
      pendingSince.current = null;
      lastWriteAt.current = Date.now();
      if (!restored.current || !worthSaving) {
        return;
      }
      // The committed snapshot from the undo buffer, not a fresh read of the
      // canvas. setUndoPoint has just put exactly these pixels there, so
      // reading the canvas again would repeat a full-canvas GPU readback for
      // nothing — and the timer can fire after the next stroke has begun, which
      // would capture it half-drawn and stall the drag by the length of that
      // readback (tens of milliseconds on a large canvas).
      //
      // It arrives already packed where the picture allows it, which is the
      // form this wants to write anyway: no conversion here at all.
      const entry = undoBuffer.getItem(state.undo.currentIndex);
      if (!entry) {
        return;
      }
      void saveDocument({
        version: 1,
        width: entry.width,
        height: entry.height,
        // A copy, not the entry's own array: that buffer belongs to the undo
        // history, and handing it to a structured clone while the app may still
        // be using it is asking for a torn record.
        pixels: new Uint8Array(entry.pixels),
        packed: entry.packed,
        // json() unwraps Overmind's proxies — a proxy cannot be structure-cloned
        palette: json(state.palette.paletteArray),
        ranges: json(state.palette.ranges),
        screenFormatId: state.canvas.screenFormatId,
        videoStandard: state.canvas.videoStandard,
        trueColorEnabled: state.canvas.trueColorEnabled,
        documentName: state.app.documentName,
        // the same value the tab title's asterisk reports, by construction
        modified: state.app.documentModified,
      });
    };
  });

  useEffect((): (() => void) | void => {
    if (!restored.current || !worthSaving || changedAt === 0) {
      return;
    }
    if (pendingSince.current === null) {
      pendingSince.current = Date.now();
    }
    // Long enough since the last write that this change is not crowding one:
    // go now, so a refresh a moment later still finds it.
    const sinceLastWrite = Date.now() - lastWriteAt.current;
    if (sinceLastWrite >= WRITE_IDLE_MS) {
      writeNow.current();
      return;
    }
    // Otherwise wait out the remaining gap — but never past the maximum wait,
    // measured from the first change still unwritten.
    const waited = Date.now() - pendingSince.current;
    const delay = Math.max(
      0,
      Math.min(WRITE_IDLE_MS - sinceLastWrite, WRITE_MAX_WAIT_MS - waited)
    );
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
