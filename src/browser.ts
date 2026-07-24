// Edge (Chromium) reserves several plain F-keys (F1 Help, F3 Find, F4 address
// bar, F5 Refresh, F6 pane focus, F7 caret browsing) as browser chrome and
// wins them back even after preventDefault() — Chrome and Safari don't do
// this, so the mode hotkeys require Shift on Edge only (GlobalHotkeyManager,
// Menu's F-key labels).
export const isEdge = /Edg\//.test(navigator.userAgent);
