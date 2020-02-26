import React, { useRef } from 'react';
import { useOvermind } from '../../overmind';
import './Menubar.css';

export function Menubar(): JSX.Element {
  const { state, actions } = useOvermind();
  const overlayRef = useRef<HTMLDivElement>(document.createElement('div'));

  const toggle = (): void => {
    if (overlayRef.current.clientHeight === 0) {
      overlayRef.current.style.height = '50%';
    } else {
      overlayRef.current.style.height = '0%';
    }
  };

  const close = (): void => {
    overlayRef.current.style.height = '0%';
  };

  return (
    <>
      <div className="menubar-area" onClick={toggle}>
        <p className="menubar__title">ReDPaint</p>
        <p className="menubar__mode-indicator">Color</p>
      </div>
      <div className="overlay" ref={overlayRef}>
        <a href="javascript:void(0)" className="closebtn" onClick={close}>
          &times;
        </a>
        <div className="overlay-content">
          <a href="#">About</a>
          <a href="#">Services</a>
          <a href="#">Clients</a>
          <a href="#">Contact</a>
        </div>
      </div>
    </>
  );
}
