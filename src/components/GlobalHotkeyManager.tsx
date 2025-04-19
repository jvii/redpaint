import { useEffect } from 'react';
import { paintingCanvasController } from '../canvas/paintingCanvas/PaintingCanvasController';
import { useActions } from '../overmind'

// A non-rendering logic component for managing hotkeys and copy/paste
export function GlobalHotKeyManager(): null {
  usePaste();
  useDebug();

  return null;
}

function usePaste(): void {
  
  function handlePaste(event: ClipboardEvent): void {
    const imageFile = event.clipboardData?.files[0];
    if (!imageFile || !isImageFile(imageFile)) {
      useActions().dialog.open('PASTE_ERROR');
      return;
    }
    useActions().app.imageFileToPasteBuffer(imageFile);
    useActions().dialog.open('PASTE_SELECT');
  }

  useEffect((): void => {
    document.addEventListener('paste', handlePaste);
  }, []);
}

function isImageFile(file: File): boolean {
  return file.type.search(/^image\//i) === 0;
}

function useDebug(): void {
  function handleKey(event: KeyboardEvent): void {
    if (event.key === ' ') {
      paintingCanvasController.visualiseIndex();
    }
  }

  useEffect((): void => {
    document.addEventListener('keydown', handleKey);
  }, []);
}
