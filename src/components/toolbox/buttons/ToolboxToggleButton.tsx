import React, { JSX, useEffect, useRef, useState } from 'react';
import { ToolboxButtonHoverManager } from './ToolboxButtonHoverManager';
import { GadgetHint } from '../GadgetHint';

// A right-click inverts the gadget for this long, acknowledging a gesture whose
// effect is often not on the gadget itself.
const RIGHT_CLICK_FLASH_MS = 100;

interface Props {
  hint?: GadgetHint;
  buttonClass: string;
  isSelected: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onRightClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export function ToolboxToggleButton({
  hint,
  buttonClass,
  isSelected,
  onClick,
  onRightClick,
}: Props): JSX.Element {
  // How the gadget looked when the gesture arrived, null when not flashing.
  const [flashFrom, setFlashFrom] = useState<boolean | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);
  useEffect((): (() => void) => () => window.clearTimeout(flashTimer.current), []);

  const handleRightClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    if (onRightClick) {
      setFlashFrom(isSelected);
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout((): void => setFlashFrom(null), RIGHT_CLICK_FLASH_MS);
      onRightClick(event);
    }
    event.preventDefault();
  };

  // Against flashFrom, not isSelected: right-clicks that select the gadget as
  // part of what they do (Symmetry, Flood Fill) would otherwise invert to the
  // resting look and show nothing.
  const lit = flashFrom === null ? isSelected : !flashFrom;

  return (
    <ToolboxButtonHoverManager isDualToggleButton={false} hint={hint}>
      <button
        className={
          'toolbox__button ' +
          (lit
            ? 'toolbox__button--' + buttonClass + '-selected' + ' toolbox_button_color_active'
            : 'toolbox__button--' + buttonClass)
        }
        onClick={onClick}
        onContextMenu={handleRightClick}
      ></button>
    </ToolboxButtonHoverManager>
  );
}
