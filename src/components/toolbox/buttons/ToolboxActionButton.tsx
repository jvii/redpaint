import React, { JSX } from 'react';
import { ToolboxButtonHoverManager } from './ToolboxButtonHoverManager';
import { GadgetHint } from '../GadgetHint';

interface Props {
  hint?: GadgetHint;
  buttonClass: string;
  // Hover text. These gadgets are wordless icons and several carry a
  // right-click action nobody would find by trying, so where one does, saying
  // so is the only thing that makes it reachable.
  title?: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onRightClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export function ToolboxActionButton({
  hint,
  buttonClass,
  title,
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
    <ToolboxButtonHoverManager isDualToggleButton={false} hint={hint}>
      <button
        className={'toolbox__button toolbox__button--' + buttonClass}
        title={title}
        onClick={onClick}
        onContextMenu={handleRightClick}
      ></button>
    </ToolboxButtonHoverManager>
  );
}
