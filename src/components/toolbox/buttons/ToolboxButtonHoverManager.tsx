import React, { JSX, useState } from 'react';
import { GadgetHint } from '../GadgetHint';
import { useGadgetHint } from '../useGadgetHint';

interface Props {
  children: React.ReactNode;
  isDualToggleButton: boolean;
  hint?: GadgetHint;
}

export function ToolboxButtonHoverManager(props: Props): JSX.Element {
  const [isHovered, setHovered] = useState(false);
  const [isLowerHalfHovered, setLowerHalfHovered] = useState(false);
  const { hintRef, showHint, hideHint, hintPanel } = useGadgetHint(props.hint);

  const handleDualToggleButtonHover = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ): void => {
    if (isLowerHalf(event)) {
      setLowerHalfHovered(true);
    } else {
      setLowerHalfHovered(false);
    }
  };

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
      ref={hintRef}
      className="toolbox_button_container"
      onMouseOver={(): void => {
        setHovered(true);
        showHint();
      }}
      onMouseLeave={(): void => {
        setHovered(false);
        hideHint();
      }}
      onMouseMove={handleDualToggleButtonHover}
      // Once you have pressed the gadget you know what it does; leaving the
      // panel up over the canvas you just clicked toward is only in the way.
      onMouseDown={hideHint}
    >
      <div className={className}></div>
      {props.children}
      {hintPanel}
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
