// UI scaling: PROTOTYPE.
//
// The problem: Windows display scaling (125%, 150%) and small laptop screens
// both shrink the viewport measured in CSS pixels (125% turns a 1920x1080
// screen into 1536x864) while every chrome dimension in this app is a
// hardcoded px. A fixed-size UI in a smaller box: the menubar and toolbox eat
// a bigger share of the window and the taller requesters stop fitting. The
// browser exposes no way to read (let alone override) the OS setting;
// devicePixelRatio is the only hint and it's ambiguous, since a Retina Mac
// reports 2.0 and there the big UI is exactly what's wanted. So this is a
// user setting, not a detection: it's in the menu panel under "UI Size".
//
// The mechanism is CSS `zoom` on the chrome containers, applied through the
// --ui-scale custom property on :root. Why zoom and not the alternatives:
//
//   - `transform: scale()` doesn't reflow: the layout keeps its old size and
//     you're left with a gap where the shrunk chrome used to be.
//   - rem-scaling every length would break the pixel-art typography: the
//     style guide requires Press Start 2P at a multiple of 8px, and
//     fractional rem sizes blur it.
//   - zoom reflows AND lands on the device pixel grid at the complementary
//     factor: 0.8 against Windows' 125% renders 16px text as exactly 16
//     physical pixels, i.e. crisper than the unscaled 125% state, with every
//     multiple-of-8 size still a multiple of 8 in real pixels.
//
// The zoom is deliberately NOT on .app: it covers the menubar, menu panel,
// toolbox column and requesters only. The canvas stack stays unzoomed: it
// already renders at devicePixelRatio (see components/canvas/hooks.tsx) and
// maps pointer coordinates against its own unscaled box, and shrinking the
// chrome to give the canvas more room is the point of the setting anyway.
//
// Viewport units INSIDE a zoomed box have to divide by --ui-scale to keep
// meaning real screen pixels: zoom multiplies computed lengths on render, and
// 100vh keeps its raw viewport value going in, so it comes out scaled.
// Percentages do NOT need this: the containing block is converted into the
// zoomed box's own units first, so 100% still means "all of it". (Verified in
// Chrome; getting this backwards pushed the menubar's right-hand indicators
// off screen.) Grep --ui-scale for the handful of sites; they're all vh.

// The offered factors: 100%, and the exact inverses of Windows' 125%, 133%
// and 150% steps, so each one can land the UI back on the device pixel grid.
export const UI_SCALES = [1, 0.8, 0.75, 0.67] as const;

const DEFAULT_UI_SCALE = 1;
const STORAGE_KEY = 'redpaint.uiScale';

export function loadUiScale(): number {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    return UI_SCALES.some((scale): boolean => scale === stored) ? stored : DEFAULT_UI_SCALE;
  } catch {
    // localStorage throws rather than returning null when site data is
    // blocked; the setting simply doesn't persist then
    return DEFAULT_UI_SCALE;
  }
}

export function storeUiScale(scale: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(scale));
  } catch {
    // see above
  }
}

export function applyUiScale(scale: number): void {
  document.documentElement.style.setProperty('--ui-scale', String(scale));
}

// The scale CSS is applying right now.
//
// For the other half of the zoom problem, and the mirror of the vh note above:
// a length *measured* with getBoundingClientRect comes back in real screen
// pixels, but a length *handed to* an element inside a zoomed box is multiplied
// by the zoom on the way in. So anything measured and then applied has to be
// divided by this first, or it lands at scale x the offset it was given.
//
// Read from the custom property rather than from Overmind, so it is whatever
// CSS is actually doing. The two cannot drift, and callers need no store.
export function currentUiScale(): number {
  const value = Number(getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'));
  return value > 0 ? value : 1;
}
