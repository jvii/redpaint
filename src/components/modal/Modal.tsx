import React, { JSX, useRef, useState } from 'react';
import './Modal.css';

interface Props {
  header: string;
  children: React.ReactNode;
  width?: number;
}

// How much of the header (the only drag handle — there's no other way to
// move a modal back once it's lost) must stay reachable on screen. Without
// this, dragging toward an edge could push the header fully out of the
// viewport with no way to grab it again.
const HEADER_MIN_VISIBLE = 40;

export function Modal({ header, children, width }: Props): JSX.Element | null {
  // Offset from the centered position, driven by dragging the header
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    // the header's on-screen position with the current offset backed out,
    // so a candidate offset during the drag can be clamped directly
    naturalX: number;
    naturalY: number;
    headerWidth: number;
  } | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: offset.x,
      baseY: offset.y,
      naturalX: rect.x - offset.x,
      naturalY: rect.y - offset.y,
      headerWidth: rect.width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!drag.current) {
      return;
    }
    const { startX, startY, baseX, baseY, naturalX, naturalY, headerWidth } = drag.current;
    const rawX = baseX + event.clientX - startX;
    const rawY = baseY + event.clientY - startY;
    const minX = HEADER_MIN_VISIBLE - headerWidth - naturalX;
    const maxX = window.innerWidth - HEADER_MIN_VISIBLE - naturalX;
    // the header can never go above the viewport top at all (nothing above
    // y: 0 is clickable), only clamped against the bottom on the way down
    const minY = -naturalY;
    const maxY = window.innerHeight - HEADER_MIN_VISIBLE - naturalY;
    setOffset({
      x: Math.min(Math.max(rawX, minX), maxX),
      y: Math.min(Math.max(rawY, minY), maxY),
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
