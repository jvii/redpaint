import React, { useState } from 'react';
import { ToolboxButtonHoverManager } from './ToolboxButtonHoverManager';

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
    <ToolboxButtonHoverManager isDualToggleButton={false}>
      <button
        className={
          'toolbox__button ' +
          (isSelected
            ? 'toolbox__button--' + buttonClass + '-selected' + ' toolbox_button_color_active'
            : 'toolbox__button--' + buttonClass)
        }
        onClick={onClick}
        onContextMenu={handleRightClick}
      ></button>
    </ToolboxButtonHoverManager>
  );
}
