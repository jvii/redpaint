import React from 'react';
import './Menubar.css';
import { useOvermind } from '../../overmind';

interface Props {
  label: string;
}

export function MenuItemSave({ label }: Props): JSX.Element {
  const { state } = useOvermind();
  return (
    <div className="menu__item">
      <div className="menu__item-is-selected"></div>
      <a
        href={
          state.undo.currentBufferItem ? URL.createObjectURL(state.undo.currentBufferItem) : '#'
        }
        download="testfile.png"
        className="menu__item-label"
      >
        {label}
      </a>
    </div>
  );
}
