import React, { JSX } from 'react';
import './Menubar.css';

interface Props {
  label: string;
  onSave: () => void;
}

export function MenuItemSave({ label, onSave }: Props): JSX.Element {
  return (
    <div className="menu__item">
      <div className="menu__item-is-selected"></div>
      <button className="menu__item-label" onClick={onSave} type="button" aria-label={label}>
        {label}
      </button>
    </div>
  );
}
