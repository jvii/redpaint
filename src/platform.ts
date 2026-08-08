// Which keyboard idiom this machine speaks.
//
// Two separate jobs depend on this, and they want opposite things. Accepting
// input is generous — Ctrl+Z works on a Mac and Cmd+Z on Windows, because a
// keystroke someone tried in good faith should not be swallowed. Advertising
// it is narrow: a Mac user never needs to know Ctrl+Y exists, and showing both
// idioms costs a reader more than it tells them.
//
// userAgentData is the non-deprecated one and is absent in Safari and Firefox,
// so navigator.platform stays as the fallback. Both are only ever read for
// which *shortcuts to print*, never to decide behaviour, so a wrong guess
// misspells a keycap rather than breaking anything.
function detectMac(): boolean {
  const platform =
    (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

export const isMac = detectMac();

// The chord prefix as this platform writes it. `⌘` matches the register the
// transform gadgets already use for `⇧`; Windows and Linux spell theirs out.
export const MOD_KEY = isMac ? '⌘' : 'Ctrl+';
export const SHIFT_MOD_KEY = isMac ? '⇧⌘' : 'Ctrl+Shift+';
