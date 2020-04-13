import React from 'react';
import './Menubar.css';

interface Props {
  label: string;
  objectURLToSave: string;
}

export function MenuItemSave({ label, objectURLToSave: href }: Props): JSX.Element {
  return (
    <div className="menu__item">
      <div className="menu__item-is-selected"></div>
      <a href={href} download="testfile.png" className="menu__item-label">
        {label}
      </a>
    </div>
  );
}
