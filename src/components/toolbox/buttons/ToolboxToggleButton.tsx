import React from 'react';
import './toolboxButtons.css';

interface Props {
  buttonClass: string;
  isSelected: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onRightClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export function ToolboxToggleButton({
  buttonClass,
  isSelected,
  onClick,
  onRightClick,
}: Props): JSX.Element {
  const handleRightClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    if (onRightClick) {
      onRightClick(event);
    }
    event.preventDefault();
  };
  return (
    <button
      className={'ToolboxButton ' + (isSelected ? buttonClass + 'Selected' : buttonClass)}
      onClick={onClick}
      onContextMenu={handleRightClick}
    ></button>
  );
}
