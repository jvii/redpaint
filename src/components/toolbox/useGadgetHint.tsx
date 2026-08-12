import { JSX, RefObject, useEffect, useRef, useState } from 'react';
import { GadgetHint, GadgetHintPanel, HintPlacement } from './GadgetHint';
import { currentUiScale } from '../../uiScale';

const HINT_DELAY_MS = 2000;

// Only one hint is ever open. Each caller owns its own state, so nothing stops
// two from being shown at once except this: whoever opens closes the last one
// first.
//
// Per-gadget hiding on mouseleave is not enough: mouseleave can be missed when
// the pointer leaves the window or a gadget unmounts under the cursor as tools
// change, and panels then pile up. This makes the invariant structural rather
// than something every path has to remember.
let closeOpenHint: (() => void) | null = null;

type Hinted = {
  // Attach to the element the panel should point at; it is what gets measured.
  hintRef: RefObject<HTMLDivElement | null>;
  showHint: () => void;
  hideHint: () => void;
  // Render inside the same element — null until the wait is over.
  hintPanel: JSX.Element | null;
};

export function useGadgetHint(hint?: GadgetHint): Hinted {
  const [hintAt, setHintAt] = useState<HintPlacement | null>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const hintTimer = useRef<number | undefined>(undefined);

  const hideHint = (): void => {
    // Cancel first, then forget the id — the other order cancels nothing.
    window.clearTimeout(hintTimer.current);
    hintTimer.current = undefined;
    if (closeOpenHint === hideHint) {
      closeOpenHint = null;
    }
    setHintAt(null);
  };

  const showHint = (): void => {
    // The id stays set while the panel is up, so this also stops mouseover
    // firing again inside the same gadget from restarting the wait.
    if (!hint || hintTimer.current !== undefined) {
      return;
    }
    hintTimer.current = window.setTimeout((): void => {
      const rect = hintRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      closeOpenHint?.();
      closeOpenHint = hideHint;
      // Anchored by the bottom for a gadget in the lower half of the window,
      // so a tall panel grows upward instead of off the screen. Cheaper than
      // measuring the panel and correcting afterwards, and the toolbox column
      // is the full height of the window, so both cases are ordinary.
      const belowMiddle = rect.top > window.innerHeight / 2;
      // Every offset below is measured in real screen pixels and then handed to
      // an element inside the zoomed chrome, where CSS multiplies it by the UI
      // Size factor again — so it has to be divided out first or the panel
      // lands at scale x the offset it was given. At 80% that put it 18px above
      // the gadget and 3px *over* the toolbox instead of 12px clear of it.
      const scale = currentUiScale();
      setHintAt({
        right: (window.innerWidth - rect.left) / scale,
        top: belowMiddle ? undefined : rect.top / scale,
        bottom: belowMiddle ? (window.innerHeight - rect.bottom) / scale : undefined,
        // The panel's anchored edge is level with the gadget's, so the gadget's
        // middle is half its height in from that edge — measured, not a CSS
        // constant, since the chrome scales with the UI Size setting.
        arrow: belowMiddle
          ? `calc(100% - ${rect.height / 2 / scale}px)`
          : `${rect.height / 2 / scale}px`,
      });
    }, HINT_DELAY_MS);
  };

  // Clearing the timer on unmount, not just on leave: the toolbox re-renders
  // as tools change, and a pending timer would set state on a gone component.
  useEffect((): (() => void) => {
    return (): void => {
      window.clearTimeout(hintTimer.current);
      // A gadget can unmount under the pointer; leaving this pointing at a dead
      // component's hide would strand the next panel open.
      if (closeOpenHint === hideHint) {
        closeOpenHint = null;
      }
    };
  }, []);

  return {
    hintRef,
    showHint,
    hideHint,
    hintPanel: hintAt && hint ? <GadgetHintPanel hint={hint} at={hintAt} /> : null,
  };
}
