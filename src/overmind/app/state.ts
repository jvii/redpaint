import { derived } from 'overmind';
import { OvermindState } from '..';
import { loadUiScale } from '../../uiScale';
import { loadBooleanPref } from '../../prefs';
import { SaveFormat } from '../../components/menu/saveFormats';
import { BrushSaveFormat } from '../../components/menu/brushSaveFormats';

// What a document with no name of its own is called: in the tab title, and as
// the name a save offers. One spelling, so the title and the save requester
// cannot disagree about what the picture is currently called.
export const UNTITLED_DOCUMENT = 'Untitled';

// The menu's drawers (Menu.tsx): mutually exclusive, one panel each.
export type Drawer = 'picture' | 'brush' | 'prefs';

export type State = {
  pasteBufferImageObjectURL: string;
  // What the image load requester shows about the decoded image awaiting a
  // color-treatment choice (the pixels themselves wait outside Overmind, in
  // canvas/pendingImage.ts). null while no load is in progress.
  imageLoadInfo: { width: number; height: number; colorCount: number } | null;
  // Same, for the brush load requester (pixels wait in canvas/pendingBrush.ts).
  // colorCount only counts opaque pixels. A brush's transparent pixels never
  // compete for a palette slot.
  brushLoadInfo: { width: number; height: number; colorCount: number } | null;
  isLoading: boolean;
  // A brief confirmation in the menu bar's mode slot, for actions that leave
  // the screen looking exactly as it did (docs/style-guide.md).
  flash: { name: string; value?: string; id: number } | null;
  // The document's name without an extension, as last saved or loaded: the name
  // a save offers, and what the tab title and the autosave record carry. Empty
  // until something names it; read displayName for the name to show.
  documentName: string;
  // What the document is called on screen: its own name, or the one word the
  // app uses for a picture that has none. Derived so the tab title and the save
  // requester cannot pick different words for the same nameless picture.
  displayName: string;
  // The name the save-name requester offers, extension included, or null when
  // it is closed. The extension is not stored alongside it: it is a function of
  // this string, and a second field could only ever disagree with it. The typed
  // answer goes back through pendingSaveName, not through here.
  // The format Save As last wrote in, which plain Save repeats. Chosen once and
  // remembered, so the choice is a property of how you are working rather than
  // something to re-answer every save.
  saveFormat: SaveFormat;
  // Remembered separately from the picture's: someone can perfectly well keep
  // pictures as PNG and brushes as IFF.
  brushSaveFormat: BrushSaveFormat;
  // The suggested base name while the Save As requester is up, or null. It asks
  // for the format always and for the name only where the browser has no picker
  // of its own: see SaveAsDialog.
  saveAsPrompt: string | null;
  // When the document last matched something outside the app: a fresh canvas, a
  // just-loaded image, or a just-written file. Anything later in the undo
  // timestamps means there are changes no file has, which is what the tab
  // title's marker reports. A time rather than a boolean so it can be compared
  // against those timestamps instead of having to be cleared by every path that
  // touches the picture.
  lastCleanTime: number;
  // Whether the picture has changes no file carries: the tab title's asterisk,
  // and what the autosave records about itself. Derived so the two cannot
  // disagree. Both undo timestamps, because either kind of history move leaves
  // the canvas differing from the file.
  //
  // Components only: deriveds are unreliable inside actions (docs/gotchas.md,
  // "Overmind").
  documentModified: boolean;
  menuOpen: boolean;
  // Which of the menu's drawers (Picture: image disk I/O; Brush: transforms +
  // brush disk; Prefs: app settings) is open (a radio group, only one at a
  // time), or null if all are collapsed. Remembered across menu open/close so
  // it reopens the way it was left, but starts collapsed: the first look at the
  // panel should be the Mode row and the three drawer buttons, not one drawer's
  // contents already spread below them.
  openDrawer: Drawer | null;
  // How much the app chrome is scaled down, for OS display scaling and small
  // screens: see uiScale.ts. Persisted in localStorage, not part of a document,
  // so it's read back here at startup.
  uiScale: number;
  // Cursor position in the menu bar, DPaint's Prefs toggle. Persisted, and not
  // part of a document.
  showCoordinates: boolean;
};

export const state: State = {
  pasteBufferImageObjectURL: '',
  imageLoadInfo: null,
  brushLoadInfo: null,
  isLoading: false,
  flash: null,
  documentName: '',
  displayName: derived((state: State) => state.documentName || UNTITLED_DOCUMENT),
  saveFormat: 'png',
  brushSaveFormat: 'png',
  saveAsPrompt: null,
  lastCleanTime: 0,
  documentModified: derived(
    (state: State, rootState: OvermindState) =>
      Math.max(rootState.undo.lastUndoPointTime, rootState.undo.lastUndoRedoTime) >
      state.lastCleanTime
  ),
  menuOpen: false,
  openDrawer: null,
  uiScale: loadUiScale(),
  showCoordinates: loadBooleanPref('showCoordinates', false),
};
