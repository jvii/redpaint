import React, { JSX, useRef, useState } from 'react';
import { useAppState } from '../../overmind';
import { RetroButton } from '../ui/RetroButton';
import './Modal.css';

interface Props {
  header: string;
  children: React.ReactNode;
  width?: number;
  // Lets the body overflow the window's box instead of scrolling inside it.
  // For requesters whose content deliberately sticks out past the window edge
  // (the palette editor's armed-action callout) — a scroll container would
  // clip exactly that. Costs those requesters the too-tall-viewport
  // protection below, so only use it when the requester is short enough that
  // it was never going to need it.
  overflowingBody?: boolean;
}

// How much of the header (the only drag handle — there's no other way to
// move a modal back once it's lost) must stay reachable on screen. Without
// this, dragging toward an edge could push the header fully out of the
// viewport with no way to grab it again.
const HEADER_MIN_VISIBLE = 100;

// The requester's footer is its trailing run of buttons (OK / Cancel / the
// dialog choices) — every caller writes them as the last children of the
// Modal, after the body. Splitting them out here, rather than asking each
// caller to wrap them, is what lets the body scroll on a short viewport
// while the buttons stay pinned to the bottom of the window: a scroll
// container has to be one element, and it can't be the whole window without
// taking the buttons (and the drag handle) out of reach with the content.
function isFooterButton(node: React.ReactNode): boolean {
  return React.isValidElement(node) && (node.type === RetroButton || node.type === 'button');
}

function splitFooter(children: React.ReactNode): {
  body: React.ReactNode[];
  footer: React.ReactNode[];
} {
  const items = React.Children.toArray(children);
  let start = items.length;
  while (start > 0 && isFooterButton(items[start - 1])) {
    start--;
  }
  return { body: items.slice(0, start), footer: items.slice(start) };
}

export function Modal({ header, children, width, overflowingBody }: Props): JSX.Element | null {
  // The UI scale (#2) is a `zoom` on the window itself, so the drag offset —
  // computed from pointer coordinates, which are unzoomed — has to be
  // divided back out before it goes into a transform inside that zoomed box.
  const uiScale = useAppState().app.uiScale;
  const { body, footer } = splitFooter(children);
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
        className={'modal__window' + (overflowingBody ? ' modal__window--overflowing' : '')}
        style={{
          transform: `translate(${offset.x / uiScale}px, ${offset.y / uiScale}px)`,
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
        <div
          className={
            'modal__body retro-scrollbar' + (overflowingBody ? ' modal__body--overflowing' : '')
          }
        >
          {body}
        </div>
        {footer.length > 0 && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
