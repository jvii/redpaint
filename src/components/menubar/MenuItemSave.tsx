import React, { JSX } from 'react';
import './Menubar.css';

interface Props {
  label: string;
  onSave: () => void;
  disabled?: boolean;
}

export function MenuItemSave({ label, onSave, disabled = false }: Props): JSX.Element {
  return (
    <div className="menu__item">
      <div className="menu__item-is-selected"></div>
      <button
        className="menu__item-label"
        onClick={onSave}
        disabled={disabled}
        type="button"
        aria-label={label}
      >
        {label}
      </button>
    </div>
  );
}
