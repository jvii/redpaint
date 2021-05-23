import React, { useRef } from 'react';
import './Modal.css';

interface Props {
  header: string;
  children: React.ReactNode;
}

export function Modal({ header, children }: Props): JSX.Element | null {
  const overlayRef = useRef<HTMLDivElement>(document.createElement('div'));
  return (
    <>
      <div className="modal__overlay-invisible" ref={overlayRef}>
        <div className="modal__window">
          <div className="modal__header">
            <p>{header}</p>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
