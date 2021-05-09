import React from 'react';
import { ToolboxButtonContainer } from './ToolboxButtonContainer';

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
    <ToolboxButtonContainer>
      <button
        className={'toolbox__button toolbox__button--' + buttonClass}
        onClick={onClick}
        onContextMenu={handleRightClick}
      ></button>
    </ToolboxButtonContainer>
  );
}
