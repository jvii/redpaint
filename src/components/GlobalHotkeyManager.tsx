import { useEffect } from 'react';
import { useActions } from '../overmind';
import { overmind } from '../index';

// A non-rendering logic component for managing hotkeys and copy/paste
export function GlobalHotKeyManager(): null {
  usePaste();
  useMenuHotkey();

  return null;
}

function usePaste(): void {
  const actions = useActions();

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

// Hotkeys belong to the canvas: they are suspended whenever keystrokes mean
// something else — a text field has focus, a dialog/requester is open, or the
// text tool is capturing keys.
function hotkeysSuspended(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable)
  ) {
    return true;
  }

  const state = overmind.state;
  if (state.dialog.activeDialog !== '') {
    return true;
  }
  if (state.paletteEditor.isOpen || state.symmetry.settingsOpen) {
    return true;
  }

  const activeToolId = state.toolbox.activeToolId;
  return activeToolId === 'textFilled' || activeToolId === 'textNoFill';
}

// Spacebar toggles the menu
function useMenuHotkey(): void {
  const actions = useActions();

  function handleKey(event: KeyboardEvent): void {
    if (event.key !== ' ' || hotkeysSuspended(event)) {
      return;
    }
    event.preventDefault(); // keep the page from scrolling
    actions.app.toggleMenu();
  }

  useEffect((): void => {
    document.addEventListener('keydown', handleKey);
  }, []);
}
