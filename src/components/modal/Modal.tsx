import React, { JSX, useRef, useState } from 'react';
import './Modal.css';

interface Props {
  header: string;
  children: React.ReactNode;
  width?: number;
}

export function Modal({ header, children, width }: Props): JSX.Element | null {
  // Offset from the centered position, driven by dragging the header
  // (Amiga requesters move by their title bar).
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(
    null
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: offset.x,
      baseY: offset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!drag.current) {
      return;
    }
    setOffset({
      x: drag.current.baseX + event.clientX - drag.current.startX,
      y: drag.current.baseY + event.clientY - drag.current.startY,
    });
  };

  const onPointerEnd = (): void => {
    drag.current = null;
  };

  return (
    <div className="modal__overlay-invisible">
      <div
        className="modal__window"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          ...(width ? { width: `${width}px` } : {}),
        }}
      >
        <div
          className="modal__header"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          <p>{header}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
