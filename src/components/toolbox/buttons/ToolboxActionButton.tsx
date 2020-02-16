import React from 'react';
import './toolboxButtons.css';

interface Props {
  buttonClass: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onRightClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export function ToolboxActionButton({ buttonClass, onClick, onRightClick }: Props): JSX.Element {
  const handleRightClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    if (onRightClick) {
      onRightClick(event);
    }
    event.preventDefault();
  };
  return (
    <button
      className={'ToolboxButton ' + buttonClass}
      onClick={onClick}
      onContextMenu={handleRightClick}
    ></button>
  );
}
