import React from 'react';
import './toolbarButtons.css';

interface Props {
  buttonClass: string;
  isLowerHalfSelected: boolean;
  isUpperHalfSelected: boolean;
  onUpperHalfClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onLowerHalfClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export function ToolbarDualToggleButton({
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
  let className = buttonClass;
  if (isLowerHalfSelected) {
    className = buttonClass + 'LowerHalfSelected';
  }
  if (isUpperHalfSelected) {
    className = buttonClass + 'UpperHalfSelected';
  }
  return <button className={'ToolbarButton ' + className} onClick={handleClick}></button>;
}

function isLowerHalfClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): boolean {
  let x = event.nativeEvent.offsetX;
  let y = 35 - event.nativeEvent.offsetY; // TODO: fix magic number
  if (y <= x) {
    return true;
  } else {
    return false;
  }
}
