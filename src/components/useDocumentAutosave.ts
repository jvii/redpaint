import { useEffect, useRef } from 'react';
import { json } from 'overmind';
import { useActions, useAppState } from '../overmind';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { currentHistory } from '../overmind/pages/PageStore';
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

// The shortest gap between writes. A change with at least this much since the
// last one goes out at once; anything behind it waits out the remainder and one
// trailing write covers the flurry, so nothing can go unwritten for longer than
// one interval however steady the hand. Writes are cheap by design (the undo
// snapshot is reused rather than read back from the GPU, and the raster packed
// to a byte a pixel), so the interval is not delicate.
const WRITE_INTERVAL_MS = 400;

// Puts the picture back where it was left and keeps it there as it changes.
// Silent by design: "discard" is the irreversible answer, and a dialog would
// ask it before anything is on screen (docs/local/undo-memory.md, part 4). Only
// the picture, never the undo history: see DocumentRecord.
export function useDocumentAutosave(): void {
  const state = useAppState();
  const actions = useActions();
  // StrictMode mounts twice; a second restore would fight the first.
  const restored = useRef(false);
  // Changed since the last write. What the page-is-going-away flush asks.
  const unsaved = useRef(false);
  // When the last write went out; the throttle measures from here.
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
        // The startup fit waits on this, so the two never both decide the
        // size. In `finally` because a failed restore must still release it.
        markRestoreSettled(record !== null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyDocument = (record: DocumentRecord): void => {
    // Through the actions, in dependency order, as an image load does: the
    // palette must reach the GL textures before the pixels that index into it,
    // and the raster is uploaded after the canvas element has resized.
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
      // freshDocument: the restored picture is the document, with no history
      { freshDocument: true, documentName: record.documentName, documentModified: record.modified }
    );
    actions.canvas.setResolution({
      width: record.width,
      height: record.height,
      recordUndoPoint: false,
    });
  };

  // When the picture last stopped matching the record. Both timestamps: a stroke
  // appends an undo entry, an undo or redo steps to a different one without
  // appending, and either leaves the record stale. Raw timestamps rather than
  // documentModified, because a second stroke must restart the timer even though
  // the document was modified before it and still is after.
  const changedAt = Math.max(state.undo.lastUndoPointTime, state.undo.lastUndoRedoTime);
  // Moves when the picture starts or stops matching a file. A save changes that
  // without touching the pixels, so it has to schedule a write of its own.
  const cleanAt = state.app.lastCleanTime;
  // Nothing is written for an untouched canvas: a blank picture at this window's
  // size would come back into a differently sized window.
  const worthSaving = state.undo.bufferEntryCount > 1 || state.app.documentName !== '';

  // In a ref so the timer and the unload listeners always call the current
  // closure rather than the one they were registered with. Refreshed in an
  // effect, not during render: a render that never commits must not leave its
  // closure behind. Declared above its callers so they only ever schedule
  // against a closure this render has installed.
  const writeNow = useRef<() => void>(() => undefined);
  useEffect((): void => {
    writeNow.current = (): void => {
      if (!restored.current || !worthSaving) {
        return; // nothing to write; leave the throttle's clock where it is
      }
      unsaved.current = false;
      lastWriteAt.current = Date.now();
      // The committed undo snapshot, not a fresh read: setUndoPoint has just
      // put these exact pixels there, so reading the canvas again would repeat
      // a full-canvas GPU readback, and the timer can fire mid-stroke,
      // capturing it half-drawn and stalling the drag. Already packed, as
      // wanted.
      const entry = currentHistory().getItem(state.undo.currentIndex);
      if (!entry) {
        return;
      }
      void saveDocument({
        version: 1,
        width: entry.width,
        height: entry.height,
        // A copy: the entry's buffer belongs to the undo history, and cloning
        // it while the app may still be using it risks a torn record.
        pixels: new Uint8Array(entry.pixels),
        packed: entry.packed,
        // json() unwraps Overmind's proxies. A proxy cannot be structure-cloned
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
    // Leading edge: nothing written recently, so this goes out at once.
    const sinceLastWrite = Date.now() - lastWriteAt.current;
    if (sinceLastWrite >= WRITE_INTERVAL_MS) {
      writeNow.current();
      return;
    }
    // Trailing edge: wait out the remainder. Further changes reset the timer to
    // the same absolute moment, since lastWriteAt only moves on a write, so a
    // steady hand cannot push the write further away.
    const timer = window.setTimeout(
      (): void => writeNow.current(),
      WRITE_INTERVAL_MS - sinceLastWrite
    );
    return (): void => window.clearTimeout(timer);
  }, [changedAt, cleanAt, worthSaving]);

  // Last chance to write, for a timer that will not fire. Best effort. The page
  // may be torn down before IndexedDB finishes, which is why the interval above
  // is short enough to stand on its own.
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
