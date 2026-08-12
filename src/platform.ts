// Which keyboard idiom this machine speaks. Read only to decide which
// shortcuts to *print*, never to decide behaviour: every chord is accepted on
// every platform, so a wrong guess misspells a keycap rather than breaking
// anything. userAgentData is the non-deprecated one and is absent in Safari and
// Firefox, hence the navigator.platform fallback.
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
