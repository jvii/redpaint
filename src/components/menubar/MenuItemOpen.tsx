import React, { JSX, useRef } from 'react';
import './Menubar.css';

interface Props {
  label: string;
  handleFile: (input: HTMLInputElement) => void;
}

export function MenuItemOpen({ label, handleFile }: Props): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = (): void => {
    fileInputRef.current?.click();
  };

  return (
    <div className="menu__item">
      <div className="menu__item-is-selected"></div>
      <button className="menu__item-label" onClick={handleClick} type="button" aria-label={label}>
        {label}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        onChange={(event): void => {
          handleFile(event.target);
          // must reset or onChange won't fire if user opens the same file again
          event.target.value = '';
        }}
        style={{ display: 'none' }}
      />
    </div>
  );
}
