import { useEffect } from 'react';
import { useAppState } from '../overmind';

const APP_NAME = 'ReDPaint';

// The editor convention for "there are changes no file has". An asterisk rather
// than a bullet: it is the older Windows/vim form, which reads as "modified" to
// more people than the macOS dot does, and it suits a program of this vintage.
const MODIFIED_MARKER = '*';

// Keeps the browser tab reporting what is open and whether it has been saved:
//
//   Untitled — ReDPaint          a fresh canvas, or one just saved
//   * seascape — ReDPaint        changes seascape.png does not have
//
// Marker first, name second, app last. Tab titles are truncated from the end,
// so the order is by how much each part is worth once there is only room for a
// few characters — and a marker that disappears exactly when several tabs are
// open is a marker that fails when it is needed.
//
// "Saved" here means exported to a file, not merely still in the app: the
// distinction is real (browser storage is not a file, and nothing has been
// written until a Save) and the asterisk is the only place the app draws it.
export function useDocumentTitle(): void {
  const state = useAppState();
  const name = state.app.displayName;
  const modified = state.app.documentModified;

  useEffect((): void => {
    document.title = `${modified ? MODIFIED_MARKER + ' ' : ''}${name} — ${APP_NAME}`;
  }, [modified, name]);
}
