import React, { useRef } from 'react';
import { useOvermind } from '../../overmind';
import { MenuItem } from './MenuItem';
import './Menubar.css';

export function Menubar(): JSX.Element {
  const { state, actions } = useOvermind();
  const overlayRef = useRef<HTMLDivElement>(document.createElement('div'));

  const toggle = (): void => {
    if (overlayRef.current.clientHeight === 0) {
      overlayRef.current.style.height = '25%';
    } else {
      overlayRef.current.style.height = '0%';
    }
  };

  const close = (): void => {
    overlayRef.current.style.height = '0%';
  };

  const mode = state.brush.mode;

  return (
    <>
      <div className="menubar" onClick={toggle}>
        <p className="menubar__title">ReDPaint</p>
        <p className="menubar__mode-indicator">{mode}</p>
      </div>
      <div className="menu" ref={overlayRef}>
        <div className="menu__content">
          <div className="menu__image">
            <div className="menu__header">Image</div>
            <MenuItem label="Open..."></MenuItem>
            <MenuItem label="Save"></MenuItem>
            <MenuItem label="Save As..."></MenuItem>
          </div>
          <div className="menu__brush">
            <div className="menu__header">Brush</div>
            <MenuItem label="Open..."></MenuItem>
            <MenuItem label="Save As..."></MenuItem>
          </div>
          <div className="menu__mode">
            <div className="menu__header">Mode</div>
            <MenuItem
              label="Matte"
              isSelected={state.brush.mode === 'Matte'}
              onClick={(): void => actions.brush.setMode('Matte')}
            ></MenuItem>
            <MenuItem
              label="Color"
              isSelected={state.brush.mode === 'Color'}
              onClick={(): void => actions.brush.setMode('Color')}
            ></MenuItem>
          </div>
        </div>
        <div className="closeButtonDiv">
          <a href="javascript:void(0)" className="menu__closebtn" onClick={close}>
            &times;
          </a>
        </div>
      </div>
    </>
  );
}
