import React, { JSX } from 'react';
import './RetroButton.css';

type Props = {
  variant?: 'primary' | 'secondary' | 'basic';
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

// A chunky requester gadget: hard drop shadow, sinks halfway on hover and
// flush on press. Primary = orange fill, secondary = black fill with orange
// shadow, basic = black outline on white.
export function RetroButton({
  variant = 'basic',
  disabled = false,
  onClick,
  children,
}: Props): JSX.Element {
  return (
    <button
      className={`retro-button retro-button--${variant}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
