import React, { JSX } from 'react';
import { ToolboxButtonHoverManager } from './ToolboxButtonHoverManager';
import { GadgetHint } from '../GadgetHint';

interface Props {
  hint?: GadgetHint;
  buttonClass: string;
  isLowerHalfSelected: boolean;
  isUpperHalfSelected: boolean;
  onUpperHalfClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onLowerHalfClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  // Only the lower (filled) half opens a right-click menu today. The outline
  // half has no per-tool settings of its own.
  onLowerHalfRightClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export function ToolboxDualToggleButton({
  hint,
  buttonClass,
  isLowerHalfSelected,
  isUpperHalfSelected,
  onUpperHalfClick,
  onLowerHalfClick,
  onLowerHalfRightClick,
}: Props): JSX.Element {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    if (isLowerHalfClick(event)) {
      onLowerHalfClick(event);
    } else {
      onUpperHalfClick(event);
    }
  };

  const handleRightClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    if (onLowerHalfRightClick && isLowerHalfClick(event)) {
      onLowerHalfRightClick(event);
    }
    event.preventDefault();
  };

  let modifier = buttonClass;
  if (isLowerHalfSelected) {
    modifier = modifier + '-lower-half-selected';
  }
  if (isUpperHalfSelected) {
    modifier = modifier + '-upper-half-selected';
  }
  return (
    <ToolboxButtonHoverManager isDualToggleButton={true} hint={hint}>
      <button
        className={
          'toolbox__button toolbox__button--' +
          modifier +
          (isLowerHalfSelected || isUpperHalfSelected ? ' toolbox_button_color_active' : '')
        }
        onClick={handleClick}
        onContextMenu={handleRightClick}
      ></button>
    </ToolboxButtonHoverManager>
  );
}

function isLowerHalfClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): boolean {
  const x = event.nativeEvent.offsetX;
  const y = 40 - event.nativeEvent.offsetY; // TODO: fix magic number
  if (y <= x) {
    return true;
  } else {
    return false;
  }
}
