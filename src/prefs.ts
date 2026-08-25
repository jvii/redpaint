// App-wide settings that outlive the document, kept in localStorage under one
// prefix. Read once at startup into Overmind, written on change.
//
// uiScale.ts predates this and keeps its own key; it carries enough of its own
// reasoning to stay where it is.
const PREFIX = 'redpaint.';

export function loadBooleanPref(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(PREFIX + key);
    return stored === null ? fallback : stored === 'true';
  } catch {
    return fallback; // private mode, or storage disabled
  }
}

export function storeBooleanPref(key: string, value: boolean): void {
  try {
    localStorage.setItem(PREFIX + key, String(value));
  } catch {
    // nothing to do: the setting still applies for this session
  }
}
