import { useEffect } from 'react';
import { useAppState } from '../overmind';

const APP_NAME = 'ReDPaint';
const MODIFIED_MARKER = '*';

// Keeps the browser tab reporting what is open and whether it has been saved:
//
//   Untitled — ReDPaint          a fresh canvas, or one just saved
//   * seascape — ReDPaint        changes seascape.png does not have
//
// Marker first, name second, app last.
//
// "Saved" here means exported to a file
export function useDocumentTitle(): void {
  const state = useAppState();
  const name = state.app.displayName;
  const modified = state.app.documentModified;

  useEffect((): void => {
    document.title = `${modified ? MODIFIED_MARKER + ' ' : ''}${name} — ${APP_NAME}`;
  }, [modified, name]);
}
