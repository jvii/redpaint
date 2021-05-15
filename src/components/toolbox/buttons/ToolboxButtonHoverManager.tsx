import React, { useState } from 'react';

interface Props {
  children: React.ReactNode;
  isDualToggleButton: boolean;
}

export function ToolboxButtonHoverManager(props: Props): JSX.Element {
  const [isHovered, setHovered] = useState(false);
  const [isLowerHalfHovered, setLowerHalfHovered] = useState(false);

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
      className="toolbox_button_container"
      onMouseOver={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleDualToggleButtonHover}
    >
      <div className={className}></div>
      {props.children}
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
