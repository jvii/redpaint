import { useEffect, useRef } from 'react';
import { json } from 'overmind';
import { useActions, useAppState } from '../overmind';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
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

// How long after a committed stroke the picture is written. Long enough that a
// flurry of quick strokes writes once, short enough that little is lost to a
// crash — and the write is off the main thread anyway, so this is about disk
// churn rather than about jank.
const WRITE_DELAY_MS = 2000;

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

  useEffect((): (() => void) | void => {
    if (!restored.current || !worthSaving || changedAt === 0) {
      return;
    }
    const timer = window.setTimeout((): void => {
      const colorIndex = paintingCanvasController.getCanvasColorIndex();
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
    }, WRITE_DELAY_MS);
    return (): void => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedAt, cleanAt, worthSaving]);
}
