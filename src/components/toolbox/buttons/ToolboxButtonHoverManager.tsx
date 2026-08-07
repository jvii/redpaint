import React, { JSX, useEffect, useRef, useState } from 'react';
import { GadgetHint, GadgetHintPanel, HintPlacement } from '../GadgetHint';

// Long enough that sweeping across the toolbox on the way somewhere else does
// not flash a panel per gadget, short enough that pausing on one feels like it
// answered rather than kept you waiting.
const HINT_DELAY_MS = 450;

interface Props {
  children: React.ReactNode;
  isDualToggleButton: boolean;
  hint?: GadgetHint;
}

export function ToolboxButtonHoverManager(props: Props): JSX.Element {
  const [isHovered, setHovered] = useState(false);
  const [isLowerHalfHovered, setLowerHalfHovered] = useState(false);
  const [hintAt, setHintAt] = useState<HintPlacement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hintTimer = useRef<number | undefined>(undefined);

  const handleDualToggleButtonHover = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ): void => {
    if (isLowerHalf(event)) {
      setLowerHalfHovered(true);
    } else {
      setLowerHalfHovered(false);
    }
  };

  const hideHint = (): void => {
    window.clearTimeout(hintTimer.current);
    setHintAt(null);
  };

  const armHint = (): void => {
    if (!props.hint || hintTimer.current !== undefined) {
      return;
    }
    hintTimer.current = window.setTimeout((): void => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      // Anchored by the bottom for a gadget in the lower half of the window,
      // so a tall panel grows upward instead of off the screen. Cheaper than
      // measuring the panel and correcting afterwards, and the toolbox column
      // is the full height of the window, so both cases are ordinary.
      const belowMiddle = rect.top > window.innerHeight / 2;
      setHintAt({
        right: window.innerWidth - rect.left,
        top: belowMiddle ? undefined : rect.top,
        bottom: belowMiddle ? window.innerHeight - rect.bottom : undefined,
      });
    }, HINT_DELAY_MS);
  };

  // Clearing the timer on unmount, not just on leave: the toolbox re-renders
  // as tools change, and a pending timer would set state on a gone component.
  useEffect((): (() => void) => {
    return (): void => window.clearTimeout(hintTimer.current);
  }, []);

  const getHoveredStyles = (): string => {
    if (props.isDualToggleButton) {
      return isLowerHalfHovered
        ? 'toolbox_dual_toggle_button_color_lower_hover'
        : 'toolbox_dual_toggle_button_color_upper_hover';
    }
    return 'toolbox_button_color_hover';
  };

  let className = 'toolbox_button_color';
  if (isHovered) {
    className = className + ' ' + getHoveredStyles();
  }

  return (
    <div
      ref={containerRef}
      className="toolbox_button_container"
      onMouseOver={(): void => {
        setHovered(true);
        armHint();
      }}
      onMouseLeave={(): void => {
        setHovered(false);
        hintTimer.current = undefined;
        hideHint();
      }}
      onMouseMove={handleDualToggleButtonHover}
      // Once you have pressed the gadget you know what it does; leaving the
      // panel up over the canvas you just clicked toward is only in the way.
      onMouseDown={hideHint}
    >
      <div className={className}></div>
      {props.children}
      {hintAt && props.hint && <GadgetHintPanel hint={props.hint} at={hintAt} />}
    </div>
  );
}

function isLowerHalf(event: React.MouseEvent<HTMLDivElement, MouseEvent>): boolean {
  const x = event.nativeEvent.offsetX;
  const y = 40 - event.nativeEvent.offsetY; // TODO: fix magic number
  if (y <= x) {
    return true;
  } else {
    return false;
  }
}
