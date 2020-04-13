import React from 'react';
import './Menubar.css';

interface Props {
  label: string;
  handleFile: (input: HTMLInputElement) => void;
}

export function MenuItemOpen({ label, handleFile }: Props): JSX.Element {
  return (
    <div className="menu__item">
      <div className="menu__item-is-selected"></div>
      <label className="menu__item-label">
        <input
          type="file"
          onChange={(event): void => {
            handleFile(event.target);
            // must reset or onChange won't fire if user opens the same file again
            event.target.value = '';
          }}
          style={{ display: 'none' }}
        ></input>
        <a>{label}</a>
      </label>
    </div>
  );
}
