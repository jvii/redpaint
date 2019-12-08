import React from 'react';
import './toolbarButtons.css';

interface Props {
  buttonClass: string;
  onClick: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) | undefined;
  onRightClick?: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) | undefined;
}

export function ToolbarButtonUnselectable({
  buttonClass,
  onClick,
  onRightClick,
}: Props): JSX.Element {
  const handleRightClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    if (onRightClick !== undefined) {
      onRightClick(event);
    }
    event.preventDefault();
  };
  return (
    <button
      className={'ToolbarButton ' + buttonClass}
      onClick={onClick}
      onContextMenu={handleRightClick}
    ></button>
  );
}
