import React, { useState } from 'react';
import { ToolboxButtonContainer } from './ToolboxButtonContainer';

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
    <ToolboxButtonContainer>
      <button
        className={
          'toolbox__button ' +
          (isSelected
            ? 'toolbox__button--' + buttonClass + '-selected'
            : 'toolbox__button--' + buttonClass)
        }
        onClick={onClick}
        onContextMenu={handleRightClick}
      ></button>
    </ToolboxButtonContainer>
  );
}
