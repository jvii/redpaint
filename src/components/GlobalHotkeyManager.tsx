import { useEffect } from 'react';
import { useActions } from '../overmind';
import { overmind } from '../index';
import { MODE_ORDER } from '../overmind/brush/mode';

// A non-rendering logic component for managing hotkeys and copy/paste
export function GlobalHotKeyManager(): null {
  usePaste();
  useMenuHotkey();
  useMiddleClickMenuToggle();
  useBrushTransformHotkeys();
  useModeHotkeys();

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

// Hotkeys belong to the canvas: they are suspended whenever keystrokes (or,
// for the middle-click menu toggle below, clicks) mean something else — a
// text field has focus, a dialog/requester is open, or the text tool is
// capturing keys. Takes just the `target` so it works for mouse events too.
function hotkeysSuspended(event: { target: EventTarget | null }): boolean {
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
    // Closing uncovers the canvas under the pointer, but the overlay cursor
    // only repaints on mousemove — replay one so it's visible immediately.
    setTimeout(refreshBrushPreview, 0);
  }

  useEffect((): void => {
    document.addEventListener('keydown', handleKey);
  }, []);
}

// Middle-click toggles the menu from anywhere — canvas, toolbox, palette,
// the menubar/menu itself — same as spacebar (useMenuHotkey above).
function useMiddleClickMenuToggle(): void {
  const actions = useActions();

  function handleMouseDown(event: MouseEvent): void {
    if (event.button === 1 && !hotkeysSuspended(event)) {
      event.preventDefault(); // middle-click toggles the menu, not autoscroll
    }
  }

  function handleAuxClick(event: MouseEvent): void {
    if (event.button !== 1 || hotkeysSuspended(event)) {
      return;
    }
    actions.app.toggleMenu();
    // Closing uncovers whatever was under the pointer, but the overlay
    // cursor only repaints on mousemove — replay one so it's visible
    // immediately.
    setTimeout(refreshBrushPreview, 0);
  }

  useEffect((): void => {
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('auxclick', handleAuxClick);
  }, []);
}

// DPaint's F1-F8 brush-mode keys, in the same MODE_ORDER the Mode toggle
// renders (Menu.tsx). Matte/Repl are custom-brush-only, same as the toggle's
// own disabled segments — the hotkey mirrors that instead of quietly setting
// a mode a built-in brush can't use.
function useModeHotkeys(): void {
  const actions = useActions();

  function handleKey(event: KeyboardEvent): void {
    if (hotkeysSuspended(event)) {
      return;
    }
    const match = /^F([1-8])$/.exec(event.key);
    if (!match) {
      return;
    }
    const mode = MODE_ORDER[Number(match[1]) - 1];
    if ((mode === 'Matte' || mode === 'Repl') && overmind.state.brush.selectedBuiltInBrushId !== null) {
      return;
    }
    event.preventDefault(); // F1 opens the browser's own help otherwise
    actions.brush.setMode(mode);
    refreshBrushPreview();
  }

  useEffect((): void => {
    document.addEventListener('keydown', handleKey);
  }, []);
}

// The brush-cursor preview on the overlay canvas only repaints on mouse move,
// so a transform applied via the keyboard would otherwise stay invisible until
// the mouse next moves. Re-sending a mousemove at the pointer's last position
// replays the active tool's own preview path (getMousePos reads clientX/Y),
// showing the transformed brush immediately.
let lastPointerPos: { x: number; y: number } | null = null;

// Exported for callers outside this file that arm a transform tool while the
// pointer isn't over the canvas at all — the menu's transform gadgets, whose
// click leaves the mouse over a gadget the closing menu panel is about to
// uncover. Same fix, same reasoning as the doc comment above.
export function refreshBrushPreview(): void {
  if (!lastPointerPos) {
    return;
  }
  const target = document.elementFromPoint(lastPointerPos.x, lastPointerPos.y);
  target?.dispatchEvent(
    new MouseEvent('mousemove', {
      clientX: lastPointerPos.x,
      clientY: lastPointerPos.y,
      bubbles: true, // React listens at the root, not on the canvas element
    })
  );
}

// DPaint's Brush menu transform keys (docs/brush-transforms.md). Case matters:
// lowercase and Shift-modified letters are different operations, so this
// switches on event.key. No-ops while a built-in brush is active (the actions
// guard). Modifier chords (Cmd-X cut etc.) must pass through untouched.
function useBrushTransformHotkeys(): void {
  const actions = useActions();

  function trackPointer(event: MouseEvent): void {
    if (event.isTrusted) {
      lastPointerPos = { x: event.clientX, y: event.clientY };
    }
  }

  function handleKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || hotkeysSuspended(event)) {
      return;
    }
    switch (event.key) {
      case 'x':
        actions.brush.flipBrushHorizontal();
        break;
      case 'y':
        actions.brush.flipBrushVertical();
        break;
      case 'z':
        actions.brush.rotateBrush90();
        break;
      case 'h':
        actions.brush.halveBrush();
        break;
      case 'H':
        actions.brush.doubleBrush();
        break;
      case 'X':
        actions.brush.doubleBrushHorizontal();
        break;
      case 'Y':
        actions.brush.doubleBrushVertical();
        break;
      case 'B':
        actions.brush.restoreOriginalBrush();
        break;
      case 'Z':
        actions.toolbox.toggleBrushTransformMode('brushStretchTool');
        break;
      case 'S':
        actions.toolbox.toggleBrushTransformMode('brushShearTool');
        break;
      case 'R':
        actions.toolbox.toggleBrushTransformMode('brushRotateTool');
        break;
      case 'Escape': {
        // cancel a pending drag transform: nothing to undo, it only previews
        const armed = overmind.state.toolbox.selectedSelectorToolId;
        if (
          armed === 'brushStretchTool' ||
          armed === 'brushShearTool' ||
          armed === 'brushRotateTool' ||
          armed === 'brushBendHorizontalTool' ||
          armed === 'brushBendVerticalTool'
        ) {
          actions.toolbox.toggleBrushTransformMode(armed);
        } else {
          return;
        }
        break;
      }
      default:
        return;
    }
    // Z/S/R and Escape arm or disarm a transform tool, which switches the
    // active tool — its onExit/onInit effects only run once React re-renders
    // (async), so an immediate refresh would hit the outgoing tool's handler
    // and then get wiped by its onExitOverlay cleanup. Deferring a tick lets
    // the switch land first.
    setTimeout(refreshBrushPreview, 0);
  }

  useEffect((): void => {
    document.addEventListener('mousemove', trackPointer);
    document.addEventListener('keydown', handleKey);
  }, []);
}
