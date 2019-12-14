import React from 'react';
import './toolbarButtons.css';

interface Props {
  buttonClass: string;
  isSelected: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onRightClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export function ToolbarToggleButton({
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
      className={'ToolbarButton ' + (isSelected ? buttonClass + 'Selected' : buttonClass)}
      onClick={onClick}
      onContextMenu={handleRightClick}
    ></button>
  );
}
