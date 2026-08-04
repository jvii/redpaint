import { loadUiScale } from '../../uiScale';

// The menu's drawers (Menu.tsx) — mutually exclusive, one panel each.
export type Drawer = 'picture' | 'brush' | 'prefs';

export type State = {
  pasteBufferImageObjectURL: string;
  // What the image load requester shows about the decoded image awaiting a
  // color-treatment choice (the pixels themselves wait outside Overmind, in
  // canvas/pendingImage.ts). null while no load is in progress.
  imageLoadInfo: { width: number; height: number; colorCount: number } | null;
  // Same, for the brush load requester (pixels wait in canvas/pendingBrush.ts).
  // colorCount only counts opaque pixels — a brush's transparent pixels never
  // compete for a palette slot.
  brushLoadInfo: { width: number; height: number; colorCount: number } | null;
  isLoading: boolean;
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
  menuOpen: false,
  openDrawer: null,
  uiScale: loadUiScale(),
};
