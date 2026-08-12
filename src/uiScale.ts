// UI scaling: PROTOTYPE.
//
// Windows display scaling and small laptop screens both shrink the viewport
// measured in CSS pixels, while every chrome dimension here is a hardcoded px,
// so the menubar and toolbox eat a bigger share of the window and the taller
// requesters stop fitting. A user setting rather than a detection, in the menu
// panel under "UI Size": the browser cannot read the OS setting, and
// devicePixelRatio is ambiguous, since a Retina Mac reports 2.0 and there the
// big UI is what is wanted.
//
// The mechanism is CSS `zoom` on the chrome containers, through the --ui-scale
// custom property on :root. Not the alternatives:
//
//   - `transform: scale()` doesn't reflow: the layout keeps its old size and
//     leaves a gap where the shrunk chrome used to be.
//   - rem-scaling every length breaks the pixel-art typography, which needs
//     Press Start 2P at a multiple of 8px (docs/style-guide.md).
//   - zoom reflows and lands on the device pixel grid at the complementary
//     factor: 0.8 against Windows' 125% renders 16px text as exactly 16
//     physical pixels, with every multiple of 8 still a multiple of 8.
//
// Deliberately not on .app: the canvas stack stays unzoomed, since it renders
// at devicePixelRatio and maps pointer coordinates against its own unscaled
// box, and giving it more room is the point of the setting.
//
// Viewport units inside a zoomed box divide by --ui-scale, percentages must
// not (docs/gotchas.md, "CSS zoom"). Grep --ui-scale for the sites; all vh.

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
// A length measured with getBoundingClientRect comes back in real screen
// pixels, but one handed to an element inside a zoomed box is multiplied by the
// zoom going in, so anything measured and then applied has to be divided by
// this first. Read from the custom property rather than from Overmind, so it is
// whatever CSS is actually doing.
export function currentUiScale(): number {
  const value = Number(getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'));
  return value > 0 ? value : 1;
}
