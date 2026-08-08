import { useEffect } from 'react';
import { useActions } from '../overmind';
import { overmind } from '../index';
import { MODE_ORDER } from '../overmind/brush/mode';
import { DrawingToolId } from '../overmind/toolbox/state';
import { isEdge } from '../browser';

// A non-rendering logic component for managing hotkeys and copy/paste.
//
// Every hook below registers its listeners on `document` and removes them on
// unmount. This component is mounted once for the app's lifetime and never
// unmounts, so today the cleanups never run — they're here so the file stops
// depending on that being true, and on addEventListener quietly de-duplicating
// StrictMode's double effect invocation (same function reference, so the
// second registration is a no-op). Either of those changing would give every
// hotkey two handlers, and two handlers on the cycling toggle cancel out into
// a dead Tab key.
export function GlobalHotKeyManager(): null {
  usePaste();
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
  // An armed crop owns the keyboard: the overlay takes Enter and Escape, and
  // every other hotkey would act on a canvas the user has stopped painting on.
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
    // only repaints on mousemove — replay one so it's visible immediately.
    setTimeout(refreshBrushPreview, 0);
  }

  useEffect((): (() => void) => {
    document.addEventListener('keydown', handleKey);
    return (): void => document.removeEventListener('keydown', handleKey);
  }, []);
}

// Tab toggles color cycling, like DPaint. Deliberately NOT gated by
// hotkeysSuspended(): that guard exists to stop stray keystrokes from
// triggering canvas/tool actions while a dialog, the palette editor, or a
// text field has focus — but color cycling is display-only (nothing it can
// corrupt), and the whole point of exposing it here is to toggle it from
// inside the palette editor while tuning a range. Browser-native Tab focus
// traversal is the thing being overridden — preventDefault every time so
// that "normal" use never wins the key back.
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

// Undo and redo from the keyboard. Until now they had none at all: the only
// way in was the toolbox UNDO gadget, left-click to undo and right-click to
// redo, which is DPaint's own arrangement but leaves redo all but invisible —
// nobody right-clicks a button to find out what happens.
//
// Both vocabularies, because they cost one key each and their users don't
// overlap:
//
//  - U, DPaint's own ("Keyboard Equivalent: U; Mnemonic: undo", DP2 manual).
//    Unshifted letters are this app's native register, as the brush transforms
//    are, and U was free.
//  - Ctrl/Cmd-Z, which anyone who has used anything else will try first, with
//    Shift for redo. Ctrl-Y as well, Windows's own redo — Ctrl only, since
//    Cmd-Y means the browser's History there and nothing here.
//
// Accepted generously, advertised narrowly: Ctrl-Z works on a Mac and Cmd-Z on
// Windows because a keystroke tried in good faith should not be swallowed, but
// the hints print one idiom per platform (src/platform.ts) rather than the
// union, which would tell every reader half of something they do not need.
//
// preventDefault on the chords only: they are the browser's own undo, and
// leaving them through would have the page act on a keystroke meant for the
// picture. Plain U needs no such claim.
//
// No bare-letter redo. DPaint had none to copy, and a second letter spent on
// the rarer half of the pair is a letter not available to a tool.
function useUndoHotkeys(): void {
  const actions = useActions();

  function handleKey(event: KeyboardEvent): void {
    // hotkeysSuspended covers a focused text field, where Ctrl-Z belongs to
    // the field, and an open requester, where it belongs to nothing yet.
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
      // Ctrl only, deliberately. Ctrl+Y is the Windows redo; Cmd+Y is not a
      // Mac idiom at all — it is the browser's History window, which `chord`
      // was quietly taking away from Mac users in exchange for a second way to
      // do something Cmd+Shift+Z already does.
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

  useEffect((): (() => void) => {
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('auxclick', handleAuxClick);
    return (): void => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('auxclick', handleAuxClick);
    };
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
// which the toolbox had none of until now — every gadget was mouse-only.
//
// Case is the whole convention and it is DPaint's, not an invention here: a
// lowercase letter picks the unfilled shape and the shifted one picks the
// filled shape, which is why the dual-toggle gadgets get both halves from one
// letter. The brush transforms above already read `event.key` the same way.
//
// Taken verbatim from the manual's table rather than chosen, including the
// mnemonics that have not aged well — `s` for the *dotted* freehand ("sketch")
// and `d` for the continuous one ("draw"), which look swapped and are not.
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
  t: 'textNoFill',
};

// Airbrush and Polygon are absent because DPaint gave them no key — the table
// runs b, B, c, C, d, D, e, E, f, F, g, G, j, K, m, p, q, r, R, s, t, u, v with
// no gap either could sit in. Inventing two would be the one part of this that
// was not the manual's, and the letters left are the ones DPaint spent on
// things dxpaint may still grow (g/G grid, j spare page, D one-pixel brush).
function useToolHotkeys(): void {
  const actions = useActions();

  function handleKey(event: KeyboardEvent): void {
    // Before the suspension check, because a text tool is one of the things
    // that suspends: hotkeysSuspended goes true the moment one is active, so
    // every key below — including the one that would pick another tool — stops
    // working and the keyboard has no way back out. The manual's own answer,
    // "Press ESC or click a drawing tool to exit Text mode". Freehand because
    // it is the tool the app starts on.
    if (event.key === 'Escape' && isTextTool(overmind.state.toolbox.activeToolId)) {
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
      // Both of these open the Fill Type dialog in DPaint, and both select the
      // tool first, exactly as right-clicking the gadget does.
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
      case ',':
        // DPaint's "Select Color cursor": the picker that samples a color off
        // the canvas, which is the Color Indicator's own click.
        actions.toolbox.toggleForegroundColorSelectionMode();
        break;
      case 'p':
        // Opens only, where DPaint's toggled. Closing from here would have to
        // reach past hotkeysSuspended, which holds the keyboard for the editor
        // while it is up — and the editor has OK and Cancel, which a palette
        // being edited wants rather than one key that means neither.
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
  // Only a canvas is worth replaying to. Anything else has no handler that
  // repaints the preview, so the replay can't help — but it can hurt: the
  // pointer being elsewhere is exactly when the last preview drawn is stale,
  // and a caller that fires while the pointer sits off-canvas (the zoom
  // divider mid-drag) would flag that stale crosshair visible again. A
  // canvas covered by something (the menu panel) is also not a target: it
  // isn't what the pointer is on, and elementFromPoint says so.
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
      // No 'R' here: it is DPaint's Filled Rectangle (useToolHotkeys below).
      // Rotate Any Angle had it for a while, but DPaint has no free-angle
      // rotate to have given a key to, and taking the toolbox's own letter for
      // an invented gadget left the rectangle the one shape whose filled half
      // could not be reached from the keyboard while circle and ellipse could.
      // Shear keeps 'S' and Stretch 'Z', neither of which the toolbox wants.
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
          // The built-in resize is armed by a different route (a right-click
          // on a brush icon, not a transform gadget) and leaves by its own
          // action rather than toggleBrushTransformMode, whose guard rejects
          // built-in brushes outright — so it needs its own arm here. It is
          // the same kind of modal drag to the user, and the menubar hint
          // offers them the same Escape.
          actions.toolbox.exitSizeBuiltInBrushMode();
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

  useEffect((): (() => void) => {
    document.addEventListener('mousemove', trackPointer);
    document.addEventListener('keydown', handleKey);
    return (): void => {
      document.removeEventListener('mousemove', trackPointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);
}
