import React from 'react';
import './Menubar.css';
import { useOvermind } from '../../overmind';

interface Props {
  label: string;
}

export function MenuItemOpen({ label }: Props): JSX.Element {
  const { actions } = useOvermind();

  function handleFiles(input: HTMLInputElement): void {
    if (input.files?.[0]) {
      actions.canvas.setLoadedImage(URL.createObjectURL(input.files[0]));
    }
  }

  return (
    <div className="menu__item">
      <div className="menu__item-is-selected"></div>
      <label className="menu__item-label">
        <input
          type="file"
          onChange={(event): void => handleFiles(event.target)}
          style={{ display: 'none' }}
        ></input>
        <a>{label}</a>
      </label>
    </div>
  );
}
