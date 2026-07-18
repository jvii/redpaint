import React, { JSX } from 'react';
import './Menubar.css';

interface Props {
  label: string;
  onClick?: () => void;
  isSelected?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

export function MenuItem({
  label,
  onClick,
  isSelected = false,
  disabled = false,
  shortcut,
}: Props): JSX.Element {
  return (
    <div className="menu__item">
      <div className="menu__item-is-selected">{isSelected ? String.fromCharCode(10004) : ''}</div>
      <button
        className="menu__item-label"
        onClick={onClick}
        disabled={disabled}
        type="button"
        aria-label={label}
      >
        {label}
        {shortcut && <span className="menu__item-shortcut">{shortcut}</span>}
      </button>
    </div>
  );
}
