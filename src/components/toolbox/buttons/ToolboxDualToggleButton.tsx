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
  // For gadgets whose settings belong to the filled half alone: Fill Style is
  // what a fill does, and the outline half does not fill.
  onLowerHalfRightClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  // For gadgets whose settings belong to both halves. Text's font is the same
  // font whether it is drawn solid or outlined, so either half opens it. Told
  // which half was hit, since the caller still selects that one — the geometry
  // is this component's (see isLowerHalfClick), not the caller's to redo.
  onRightClick?: (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    isLowerHalf: boolean
  ) => void;
}

export function ToolboxDualToggleButton({
  hint,
  buttonClass,
  isLowerHalfSelected,
  isUpperHalfSelected,
  onUpperHalfClick,
  onLowerHalfClick,
  onLowerHalfRightClick,
  onRightClick,
}: Props): JSX.Element {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    if (isLowerHalfClick(event)) {
      onLowerHalfClick(event);
    } else {
      onUpperHalfClick(event);
    }
  };

  const handleRightClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    if (onRightClick) {
      onRightClick(event, isLowerHalfClick(event));
    } else if (onLowerHalfRightClick && isLowerHalfClick(event)) {
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
