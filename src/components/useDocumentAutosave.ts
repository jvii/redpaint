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
import { markRestoreSettled } from '../persistence/restoreSettled';

// The shortest gap between two writes. A change arriving with at least this
// much since the last write goes out at once; anything crowding in behind it
// waits out the remainder, and one trailing write covers the whole flurry.
//
// A plain leading+trailing throttle, and it is the only knob. What it replaced
// was three mechanisms that had accreted one per bug — a debounce, a maximum
// wait so steady painting could not starve it, and a leading edge so a single
// stroke was not left unsaved for the delay's whole length — which together
// took two constants, two refs and an arithmetic reconciliation of the two.
//
// A throttle needs none of that, because the starvation the maximum wait
// existed to prevent cannot arise: the leading edge writes immediately when
// nothing is pending, so the longest a change can go unwritten is one interval,
// whatever the hand is doing. That is strictly tighter than the 1500 ms bound it
// replaces (docs/autosave-simplification.md §3).
//
// Writes were deliberately made cheap enough to be frequent — the undo
// snapshot is reused rather than read back from the GPU, and the raster is
// packed to a byte a pixel — so the interval is not delicate.
const WRITE_INTERVAL_MS = 400;

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
  // Whether the picture has changed since the last write — what the
  // page-is-going-away flush asks, and all the scheduler needs to remember
  // besides when it last wrote.
  const unsaved = useRef(false);
  // When the last write went out. The throttle measures from here, so a change
  // that is not crowding another goes straight out.
  const lastWriteAt = useRef(0);

  useEffect((): void => {
    if (restored.current) {
      return;
    }
    restored.current = true;
    void (async (): Promise<void> => {
      let record: DocumentRecord | null = null;
      try {
        record = await loadDocument();
        if (record) {
          applyDocument(record);
          await finishRestore();
        }
      } finally {
        // The startup canvas fit waits on this and runs only when there was
        // nothing to restore, so the two never both decide the size. In the
        // `finally` because a fit that never happens leaves no canvas at all —
        // a failed restore must still release it.
        markRestoreSettled(record !== null);
      }
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
      if (!restored.current || !worthSaving) {
        return; // nothing to write; leave the throttle's clock where it is
      }
      unsaved.current = false;
      lastWriteAt.current = Date.now();
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
    unsaved.current = true;
    // Leading edge: nothing written recently, so this change is not crowding
    // anything and goes out at once — a refresh a moment after a single stroke
    // still finds it.
    const sinceLastWrite = Date.now() - lastWriteAt.current;
    if (sinceLastWrite >= WRITE_INTERVAL_MS) {
      writeNow.current();
      return;
    }
    // Trailing edge: wait out what is left of the interval. Each further change
    // re-runs this effect, which clears the timer and sets another — but for the
    // same absolute moment, since lastWriteAt does not move until a write
    // happens. A steady hand therefore cannot push the write further away, which
    // is the starvation the old maximum wait existed to prevent.
    const timer = window.setTimeout(
      (): void => writeNow.current(),
      WRITE_INTERVAL_MS - sinceLastWrite
    );
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
      if (unsaved.current) {
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
