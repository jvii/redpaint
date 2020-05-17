import { useEffect } from 'react';
import { useOvermind } from '../overmind';

// A non-rendering logic component for managing hotkeys and copy/paste
export function GlobalHotKeyManager(): null {
  usePaste();

  return null;
}

function usePaste(): void {
  const { actions } = useOvermind();

  function handlePaste(event: ClipboardEvent): void {
    const imageFile = event.clipboardData?.files[0];
    if (!imageFile || !isImageFile(imageFile)) {
      actions.dialog.open('PASTE_ERROR');
      return;
    }
    actions.app.imageFileToPasteBuffer(imageFile);
    actions.dialog.open('PASTE_SELECT');
  }

  useEffect((): void => {
    document.addEventListener('paste', handlePaste);
  }, []);
}

function isImageFile(file: File): boolean {
  return file.type.search(/^image\//i) === 0;
}
