import { useEffect } from 'react';
import { useActions } from '../overmind';
import { overmind } from '../index';
import { MODE_ORDER } from '../overmind/brush/mode';
import { DrawingToolId } from '../overmind/toolbox/state';
import { isEdge } from '../browser';
import { copyableBrush, copyPicture } from './menu/copyToClipboard';

// A non-rendering logic component for managing hotkeys and copy/paste.
//
// Every hook below registers its listeners on `document` and removes them on
// unmount. The component never unmounts today, so the cleanups never run. They
// are here so nothing depends on that, nor on addEventListener de-duplicating
// StrictMode's double invocation. Either changing would give every hotkey two
// handlers, and two handlers on the cycling toggle cancel out into a dead Tab.
export function GlobalHotKeyManager(): null {
  usePaste();
  useCopyHotkey();
  useMenuHotkey();
  useCyclingHotkey();
  useUndoHotkeys();
  useMiddleClickMenuToggle();
  useBrushTransformHotkeys();
  useModeHotkeys();
  useToolHotkeys();

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

  useEffect((): (() => void) => {
    document.addEventListener('paste', handlePaste);
    return (): void => document.removeEventListener('paste', handlePaste);
  }, []);
}

function isImageFile(file: File): boolean {
  return file.type.search(/^image\//i) === 0;
}

// Ctrl/Cmd-C, the counterpart to the paste above. With no drawer to have said
// which, it asks — but only when both answers exist. A built-in brush is not
// worth copying (copyToClipboard.ts), so with one of those selected there is
// one thing on screen to copy and no question to put.
function useCopyHotkey(): void {
  const actions = useActions();

  function handleKey(event: KeyboardEvent): void {
    if (hotkeysSuspended(event) || !(event.ctrlKey || event.metaKey)) {
      return;
    }
    if (event.key.toLowerCase() !== 'c' || event.altKey || event.shiftKey) {
      return;
    }
    // A real text selection's copy belongs to the browser. Chrome here is
    // user-select: none, so this only defers when something is genuinely
    // selected — in a requester, say.
    if (document.getSelection()?.isCollapsed === false) {
      return;
    }
    event.preventDefault();
    if (copyableBrush()) {
      actions.dialog.open('COPY_SELECT');
    } else {
      void copyPicture();
    }
  }

  useEffect((): (() => void) => {
    document.addEventListener('keydown', handleKey);
    return (): void => document.removeEventListener('keydown', handleKey);
  }, []);
}

// Hotkeys belong to the canvas, so they are suspended whenever keystrokes mean
// something else. Takes just the `target`, so it works for mouse events too.
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
  if (state.paletteEditor.isOpen || state.symmetry.settingsOpen || state.font.settingsOpen) {
    return true;
  }
  // An armed crop owns the keyboard: the overlay takes Enter and Escape.
  if (state.crop.rect) {
    return true;
  }

  return isTextTool(state.toolbox.activeToolId);
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
    // only repaints on mousemove: replay one so it's visible immediately.
    setTimeout(refreshBrushPreview, 0);
  }

  useEffect((): (() => void) => {
    document.addEventListener('keydown', handleKey);
    return (): void => document.removeEventListener('keydown', handleKey);
  }, []);
}

// Tab toggles color cycling, like DPaint. Deliberately not gated by
// hotkeysSuspended: the point of the key is to toggle it from inside the
// palette editor. preventDefault every time, so native focus traversal never
// wins the key back.
function useCyclingHotkey(): void {
  const actions = useActions();

  function handleKey(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }
    event.preventDefault();
    actions.palette.toggleCycling();
  }

  useEffect((): (() => void) => {
    document.addEventListener('keydown', handleKey);
    return (): void => document.removeEventListener('keydown', handleKey);
  }, []);
}

// Undo and redo: U, DPaint's own, plus Ctrl/Cmd-Z and Ctrl-Y. Every chord is
// accepted on every platform, though the hints print one idiom each
// (src/platform.ts). preventDefault on the chords only. They are the browser's
// own undo.
function useUndoHotkeys(): void {
  const actions = useActions();

  function handleKey(event: KeyboardEvent): void {
    // In a focused text field Ctrl-Z belongs to the field.
    if (hotkeysSuspended(event)) {
      return;
    }
    const chord = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (chord && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        actions.undo.redo();
      } else {
        actions.undo.undo();
      }
    } else if (event.ctrlKey && !event.metaKey && key === 'y') {
      // Ctrl only: Cmd+Y is the browser's History window on a Mac, not a redo.
      event.preventDefault();
      actions.undo.redo();
    } else if (!chord && !event.altKey && event.key === 'u') {
      actions.undo.undo();
    }
  }

  useEffect((): (() => void) => {
    document.addEventListener('keydown', handleKey);
    return (): void => document.removeEventListener('keydown', handleKey);
  }, []);
}

// Middle-click toggles the menu from anywhere (canvas, toolbox, palette, the
// menubar/menu itself), same as spacebar (useMenuHotkey above).
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
    // Closing uncovers whatever was under the pointer, but the overlay cursor
    // only repaints on mousemove: replay one so it's visible immediately.
    setTimeout(refreshBrushPreview, 0);
  }

  useEffect((): (() => void) => {
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('auxclick', handleAuxClick);
    return (): void => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('auxclick', handleAuxClick);
    };
  }, []);
}

// DPaint's F1-F8 brush-mode keys, in the MODE_ORDER the Mode toggle renders
// (Menu.tsx). Matte/Repl are skipped on a built-in brush, as the toggle's own
// segments are.
function useModeHotkeys(): void {
  const actions = useActions();

  function handleKey(event: KeyboardEvent): void {
    if (hotkeysSuspended(event)) {
      return;
    }
    const match = /^F([1-8])$/.exec(event.key);
    if (!match || event.shiftKey !== isEdge) {
      return;
    }
    const mode = MODE_ORDER[Number(match[1]) - 1];
    if ((mode === 'Matte' || mode === 'Repl') && overmind.state.brush.usingBuiltInBrush) {
      return;
    }
    event.preventDefault(); // F1 opens the browser's own help otherwise
    actions.brush.setMode(mode);
    refreshBrushPreview();
  }

  useEffect((): (() => void) => {
    document.addEventListener('keydown', handleKey);
    return (): void => document.removeEventListener('keydown', handleKey);
  }, []);
}

// DPaint's Toolbox commands (DP2 manual, "Keyboard Commands and Cursors"),
// taken verbatim from the manual's table. Case is the convention: a lowercase
// letter picks the unfilled shape and the shifted one the filled shape.
const SHAPE_KEYS: { [key: string]: DrawingToolId } = {
  s: 'dottedFreehand',
  d: 'freeHand',
  v: 'line',
  q: 'curve',
  f: 'floodFill',
  r: 'rectangleNoFill',
  R: 'rectangleFilled',
  c: 'circleNoFill',
  C: 'circleFilled',
  e: 'ellipseNoFill',
  E: 'ellipseFilled',
  // Text inverts the case convention above: DPaint's `t` enters plain text,
  // which is the filled half here.
  t: 'textFilled',
  T: 'textNoFill',
};

// Airbrush and Polygon are absent because DPaint gave them no key.
function useToolHotkeys(): void {
  const actions = useActions();

  function handleKey(event: KeyboardEvent): void {
    // Before the suspension check: a text tool suspends every key below,
    // including the ones that would pick another tool, so this is the keyboard's
    // only way out of it. Not while the font requester is up, though — that is
    // a window with OK and Cancel, and leaving the tool out from under it would
    // be neither.
    if (
      event.key === 'Escape' &&
      isTextTool(overmind.state.toolbox.activeToolId) &&
      !overmind.state.font.settingsOpen
    ) {
      event.preventDefault();
      actions.toolbox.setSelectedDrawingTool('freeHand');
      return;
    }
    // Modifier chords belong to the browser and to the undo hotkeys; Alt makes
    // dead keys on several layouts, which arrive as a letter here.
    if (event.ctrlKey || event.metaKey || event.altKey || hotkeysSuspended(event)) {
      return;
    }

    const shapeTool = SHAPE_KEYS[event.key];
    if (shapeTool) {
      event.preventDefault();
      actions.toolbox.setSelectedDrawingTool(shapeTool);
      refreshBrushPreview();
      return;
    }

    switch (event.key) {
      // Selects the tool first, as right-clicking the gadget does.
      case 'F':
        actions.toolbox.setSelectedDrawingTool('floodFill');
        actions.fillStyle.openSettings();
        break;
      case 'b':
        actions.toolbox.toggleBrushSelectionMode();
        break;
      case 'm':
        actions.toolbox.toggleZoomMode();
        break;
      case '/':
        // Firefox opens quick-find on a bare slash.
        event.preventDefault();
        actions.toolbox.toggleSymmetryMode();
        break;
      case 'K':
        actions.app.clearPage();
        break;
      case 'j':
        actions.pages.swap();
        break;
      case 'J':
        actions.pages.copyToSpare();
        break;
      case ',':
        actions.toolbox.toggleForegroundColorSelectionMode();
        break;
      case 'p':
        // Opens only, where DPaint's toggled: closing would have to reach past
        // hotkeysSuspended, and the editor has OK and Cancel.
        actions.paletteEditor.open();
        break;
      default:
        return;
    }
    refreshBrushPreview();
  }

  useEffect((): (() => void) => {
    document.addEventListener('keydown', handleKey);
    return (): void => document.removeEventListener('keydown', handleKey);
  }, []);
}

function isTextTool(toolId: string): boolean {
  return toolId === 'textFilled' || toolId === 'textNoFill';
}

// The overlay's brush-cursor preview only repaints on mouse move, so a
// transform applied from the keyboard stays invisible until the mouse next
// moves. Re-sending a mousemove at the pointer's last position replays the
// active tool's own preview path.
let lastPointerPos: { x: number; y: number } | null = null;

// Exported for callers that arm a transform tool while the pointer is not over
// the canvas. The menu's transform gadgets, whose click leaves the mouse over a
// gadget the closing panel is about to uncover.
export function refreshBrushPreview(): void {
  if (!lastPointerPos) {
    return;
  }
  const target = document.elementFromPoint(lastPointerPos.x, lastPointerPos.y);
  // Only a canvas is worth replaying to. Elsewhere nothing repaints the
  // preview, and the replay can make a stale one visible again. A caller firing
  // while the pointer sits off-canvas (the zoom divider mid-drag) would flag
  // the old crosshair back up. A canvas covered by the menu panel is not a
  // target either, and elementFromPoint says so.
  if (!(target instanceof HTMLCanvasElement)) {
    return;
  }
  target.dispatchEvent(
    new MouseEvent('mousemove', {
      clientX: lastPointerPos.x,
      clientY: lastPointerPos.y,
      bubbles: true, // React listens at the root, not on the canvas element
    })
  );
}

// DPaint's Brush menu transform keys (docs/brush-transforms.md). Case matters
// (lowercase and shifted letters are different operations), so this switches on
// event.key. Modifier chords (Cmd-X cut etc.) must pass through untouched.
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
      // No 'R' here: it is DPaint's Filled Rectangle (useToolHotkeys below),
      // and DPaint gives ROTATE no keyboard equivalent.
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
        } else if (armed === 'sizeBuiltInBrushTool') {
          // The built-in resize leaves by its own action, not
          // toggleBrushTransformMode, whose guard rejects built-in brushes.
          actions.toolbox.exitSizeBuiltInBrushMode();
        } else {
          return;
        }
        break;
      }
      default:
        return;
    }
    // Z/S/R and Escape switch the active tool, whose onExit/onInit effects only
    // run once React re-renders. An immediate refresh would hit the outgoing
    // tool's handler and be wiped by its onExitOverlay; a tick lets the switch
    // land first.
    setTimeout(refreshBrushPreview, 0);
  }

  useEffect((): (() => void) => {
    document.addEventListener('mousemove', trackPointer);
    document.addEventListener('keydown', handleKey);
    return (): void => {
      document.removeEventListener('mousemove', trackPointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);
}
