import { loadUiScale } from '../../uiScale';

// What a document with no name of its own is called — in the tab title, and as
// the name a save offers. One spelling, so the title and the save requester
// cannot disagree about what the picture is currently called.
export const UNTITLED_DOCUMENT = 'Untitled';

// The menu's drawers (Menu.tsx) — mutually exclusive, one panel each.
export type Drawer = 'picture' | 'brush' | 'prefs';

export type State = {
  pasteBufferImageObjectURL: string;
  // What the image load requester shows about the decoded image awaiting a
  // color-treatment choice (the pixels themselves wait outside Overmind, in
  // canvas/pendingImage.ts). null while no load is in progress.
  imageLoadInfo: {
    width: number;
    height: number;
    colorCount: number;
    documentName: string;
  } | null;
  // Same, for the brush load requester (pixels wait in canvas/pendingBrush.ts).
  // colorCount only counts opaque pixels — a brush's transparent pixels never
  // compete for a palette slot.
  brushLoadInfo: { width: number; height: number; colorCount: number } | null;
  isLoading: boolean;
  // The document's name without an extension, as last saved or loaded — the
  // name a save offers, and (later) what the tab title and the autosave record
  // will carry. Empty until something names it, which the save requester reads
  // as "untitled".
  documentName: string;
  // The save-name requester's subject while it is open: what to offer and what
  // the file will end up called. Null when it is closed. The typed answer goes
  // back through pendingSaveName, not through here — see that module.
  saveNamePrompt: { suggested: string; extension: string } | null;
  // When the document last matched something outside the app: a fresh canvas,
  // a just-loaded image, or a just-written file. Anything later in the undo
  // timestamps means there are changes no file has — which is what the tab
  // title's marker reports. A time rather than a boolean so it can be compared
  // against those timestamps instead of having to be cleared by every path
  // that touches the picture.
  lastCleanTime: number;
  menuOpen: boolean;
  // Which of the menu's drawers (Picture: image disk I/O; Brush: transforms
  // + brush disk; Prefs: app settings) is open — a radio group, only one at
  // a time — or null if all are collapsed. Remembered across menu open/close
  // so it reopens the way it was left, but starts collapsed: the first look
  // at the panel should be the Mode row and the three drawer buttons, not one
  // drawer's contents already spread below them.
  openDrawer: Drawer | null;
  // How much the app chrome is scaled down, for OS display scaling and small
  // screens — see uiScale.ts. Persisted in localStorage, not part of a
  // document, so it's read back here at startup.
  uiScale: number;
};

export const state: State = {
  pasteBufferImageObjectURL: '',
  imageLoadInfo: null,
  brushLoadInfo: null,
  isLoading: false,
  documentName: '',
  saveNamePrompt: null,
  lastCleanTime: 0,
  menuOpen: false,
  openDrawer: null,
  uiScale: loadUiScale(),
};
