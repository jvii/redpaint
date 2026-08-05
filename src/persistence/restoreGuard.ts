// A restore that crashed the tab must not be retried forever. The marker goes
// down before the record is touched and comes up once it is safely applied, so
// a start that finds it already set knows the last attempt did not survive —
// and the caller drops that record instead of trying again.
//
// localStorage rather than IndexedDB: the marker has to have landed before the
// thing that might crash begins, and only a synchronous write guarantees that.
// A single value, so none of the size objections to localStorage apply.
//
// It holds a time, not a flag, because localStorage is shared by every tab on
// the origin. A marker seconds old means another tab is restoring right now —
// which is nothing like "we died last time", and treating it as such let a
// second tab delete the saved picture out from under the first. Only a marker
// older than any restore could possibly take means the attempt really did stop.
const GUARD_KEY = 'redpaint.restoring';

// A restore is a read and an upload: milliseconds. Anything still marked after
// this was not slow, it was interrupted.
const GUARD_STALE_MS = 15000;

// Records which record was being applied, not just when. With one key per tab
// the two can differ — a tab may be applying a record it adopted from another —
// and dropping "ours" on the next start would leave the one that actually
// stopped us sitting there for the next tab to adopt.
export function markRestoreStarted(recordKey: string): void {
  try {
    window.localStorage.setItem(GUARD_KEY, `${Date.now()}:${recordKey}`);
  } catch {
    // blocked site data throws rather than returning null; the guard simply
    // does not operate, which is no worse than not having it
  }
}

export function markRestoreFinished(): void {
  try {
    window.localStorage.removeItem(GUARD_KEY);
  } catch {
    // see above
  }
}

// The record an interrupted attempt was applying, or null when there is nothing
// to do — no marker, or one recent enough to belong to another tab restoring
// right now. A marker with no key (an older build's, or nonsense) falls back to
// the caller's own record: it is the only guess available, and leaving a marker
// to block every restore forever would be worse than one wasted retry.
export function interruptedRecordKey(fallbackKey: string): string | null {
  try {
    const marked = window.localStorage.getItem(GUARD_KEY);
    if (marked === null) {
      return null;
    }
    const separator = marked.indexOf(':');
    const at = Number(separator === -1 ? marked : marked.slice(0, separator));
    if (Number.isFinite(at) && Date.now() - at <= GUARD_STALE_MS) {
      return null;
    }
    return (separator === -1 ? '' : marked.slice(separator + 1)) || fallbackKey;
  } catch {
    return null;
  }
}

// For the dev-only state dump — see documentAutosave.autosaveState.
export function restoreMarker(): string | null {
  try {
    return window.localStorage.getItem(GUARD_KEY);
  } catch {
    return null;
  }
}
