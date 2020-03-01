import React from 'react';
import { useOvermind } from '../../overmind';
import './Menubar.css';

interface Props {
  label: string;
  onClick?: () => void;
  isSelected?: boolean;
}

export function MenuItem({ label, onClick, isSelected = false }: Props): JSX.Element {
  const { state, actions } = useOvermind();

  return (
    <div className="menu__item">
      <div className="menu__item-is-selected">{isSelected ? String.fromCharCode(10004) : ''}</div>
      <a href="#" className="menu__item-label" onClick={onClick}>
        {label}
      </a>
    </div>
  );
}
