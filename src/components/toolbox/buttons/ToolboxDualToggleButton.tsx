import React from 'react';

interface Props {
  buttonClass: string;
  isLowerHalfSelected: boolean;
  isUpperHalfSelected: boolean;
  onUpperHalfClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onLowerHalfClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export function ToolboxDualToggleButton({
  buttonClass,
  isLowerHalfSelected,
  isUpperHalfSelected,
  onUpperHalfClick,
  onLowerHalfClick,
}: Props): JSX.Element {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    if (isLowerHalfClick(event)) {
      onLowerHalfClick(event);
    } else {
      onUpperHalfClick(event);
    }
  };
  let modifier = buttonClass;
  if (isLowerHalfSelected) {
    modifier = modifier + '-lower-half-selected';
  }
  if (isUpperHalfSelected) {
    modifier = modifier + '-upper-half-selected';
  }
  return (
    <div className="toolbox_button_container">
      <button
        className={'toolbox__button toolbox__button--' + modifier}
        onClick={handleClick}
      ></button>
    </div>
  );
}

function isLowerHalfClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): boolean {
  const x = event.nativeEvent.offsetX;
  const y = 35 - event.nativeEvent.offsetY; // TODO: fix magic number
  if (y <= x) {
    return true;
  } else {
    return false;
  }
}
