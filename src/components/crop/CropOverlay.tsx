import React, { JSX, useEffect, useRef, useState } from 'react';
import { useActions, useAppState } from '../../overmind';
import { CropRect } from '../../overmind/crop/state';
import { Point } from '../../types';
import './CropOverlay.css';

// The eight resize grips, named by which edges each one moves. Corner grips
// move two edges, edge grips one, which is the whole definition, so the hit
// areas and the cursors both fall out of it rather than being listed twice. The
// grip glyph: one double-headed arrow, rotated to match the axis each grip
// drags along. Action-glyph register per the style guide (currentColor stroke,
// no fill), so it tracks the grip's own colour for free. The rotation is
// already implied by the cursor, so it's derived rather than listed twice.
const ARROW_ROTATION: Record<string, number> = {
  'ew-resize': 0,
  'ns-resize': 90,
  'nwse-resize': 45,
  'nesw-resize': -45,
};

function GripArrow({ cursor }: { cursor: string }): JSX.Element {
  return (
    <svg
      className="crop-overlay__arrow"
      viewBox="0 0 14 14"
      width="14"
      height="14"
      aria-hidden="true"
      style={{ transform: `rotate(${ARROW_ROTATION[cursor] ?? 0}deg)` }}
    >
      <path
        d="M1 7 H13 M1 7 L4.5 3.5 M1 7 L4.5 10.5 M13 7 L9.5 3.5 M13 7 L9.5 10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

// How far the pointer must travel outside the box before it counts as drawing
// a new one rather than as a click that should do nothing. Canvas pixels, so
// it tightens as you zoom in, which is the right way round.
const DRAW_THRESHOLD = 3;

type Grip = {
  id: string;
  // which edges this grip moves; the ones it omits stay put
  left?: boolean;
  right?: boolean;
  top?: boolean;
  bottom?: boolean;
  cursor: string;
};

const GRIPS: Grip[] = [
  { id: 'nw', left: true, top: true, cursor: 'nwse-resize' },
  { id: 'n', top: true, cursor: 'ns-resize' },
  { id: 'ne', right: true, top: true, cursor: 'nesw-resize' },
  { id: 'w', left: true, cursor: 'ew-resize' },
  { id: 'e', right: true, cursor: 'ew-resize' },
  { id: 'sw', left: true, bottom: true, cursor: 'nesw-resize' },
  { id: 's', bottom: true, cursor: 'ns-resize' },
  { id: 'se', right: true, bottom: true, cursor: 'nwse-resize' },
];

type Drag =
  | { kind: 'move'; grab: Point; start: CropRect }
  | { kind: 'resize'; grip: Grip; start: CropRect }
  // Pressing outside the box arms a redraw but changes nothing yet: a click
  // out there must leave the box alone, so the new one only begins once the
  // pointer has actually travelled. Without that, every stray click collapsed
  // the box to a single pixel under the cursor.
  | { kind: 'draw'; origin: Point; started: boolean };

// The interactive crop box: drag the body to move it, a grip to resize, or the
// dimmed area to draw a fresh box. Right-click commits, as does Enter or a
// double-click inside; Escape cancels.
//
// Deliberately DOM rather than the WebGL overlay the other previews use. This
// is chrome, not pixels. It wants hover cursors, forgiving grip hit areas and a
// live readout, all of which are free here and hand-rolled there. Covering the
// canvas is also what makes the mode modal: pointer events stop at the overlay,
// so no painting happens underneath.
export function CropOverlay({ displayScale }: { displayScale: Point }): JSX.Element | null {
  const state = useAppState();
  const actions = useActions();
  const rect = state.crop.rect;
  const dragRef = useRef<Drag | null>(null);
  // Shown until the first drag actually moves something, then gone for the rest
  // of the session. It answers "what do I do here", which stops being a
  // question the moment you have done it. Component state, not Overmind: the
  // overlay is mounted only while a crop is armed, so every crop starts by
  // saying this once.
  const [showHint, setShowHint] = useState(true);
  const hostRef = useRef<HTMLDivElement>(null);

  // The scale comes from the canvas component that owns it rather than from
  // the Overmind mirror, which is written after the fact and would put the box
  // a frame behind the artwork on a window resize.
  const scale = displayScale;
  const canvas = state.canvas.resolution;

  // Enter/Escape belong to the whole armed mode, not to whatever has focus,
  // so they're caught on the window for as long as a box is up.
  useEffect((): (() => void) | void => {
    if (!rect) {
      return;
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Enter') {
        event.preventDefault();
        actions.crop.apply();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        actions.crop.cancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return (): void => window.removeEventListener('keydown', onKey);
  }, [rect, actions]);

  if (!rect) {
    return null;
  }

  // Canvas coordinates are what the crop is expressed in; CSS pixels are what
  // it is drawn in. displayScale is per axis, since a screen format's pixels
  // need not be square.
  const toCss = (value: number, axis: 'x' | 'y'): number => value * scale[axis];
  //
  // Rounded, where the painting tools' getMousePos floors: a tool picks the
  // pixel the pointer is over, a crop grip the *edge* between two pixels, and
  // the nearest edge is the one the pointer is closest to. Flooring would bias
  // every edge half a pixel up and left.
  const pointerToCanvas = (event: React.PointerEvent): Point => {
    const bounds = hostRef.current?.getBoundingClientRect();
    if (!bounds) {
      return { x: 0, y: 0 };
    }
    return {
      x: Math.round((event.clientX - bounds.left) / scale.x),
      y: Math.round((event.clientY - bounds.top) / scale.y),
    };
  };

  // Moving keeps the box's size and stops against the edges. Clamping its
  // extents instead (the rule the other two gestures want) made a box shoved
  // right shrink against the edge rather than halt at it.
  const clampMoved = (next: CropRect): CropRect => ({
    ...next,
    x: Math.max(0, Math.min(next.x, canvas.width - next.width)),
    y: Math.max(0, Math.min(next.y, canvas.height - next.height)),
  });

  // Resizing and drawing move one edge at a time, so here it is the edges that
  // are held inside the canvas.
  const clampRect = (next: CropRect): CropRect => {
    const x = Math.max(0, Math.min(next.x, canvas.width - 1));
    const y = Math.max(0, Math.min(next.y, canvas.height - 1));
    return {
      x,
      y,
      width: Math.max(1, Math.min(next.width, canvas.width - x)),
      height: Math.max(1, Math.min(next.height, canvas.height - y)),
    };
  };

  const onPointerDown =
    (drag: Drag) =>
    (event: React.PointerEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      (event.target as Element).setPointerCapture(event.pointerId);
      dragRef.current = drag;
    };

  const onPointerMove = (event: React.PointerEvent): void => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    // A move with no button held cannot be a drag, so a drag still recorded
    // here is stale. The overlay's DOM can vanish mid-gesture when a
    // right-click commits, taking the captured element and its pointerup. Drop
    // it, or the box follows the pointer with nothing pressed.
    if (event.buttons === 0) {
      dragRef.current = null;
      return;
    }
    setShowHint(false);
    const at = pointerToCanvas(event);

    if (drag.kind === 'move') {
      actions.crop.setRect(
        clampMoved({
          ...drag.start,
          x: drag.start.x + (at.x - drag.grab.x),
          y: drag.start.y + (at.y - drag.grab.y),
        })
      );
      return;
    }

    if (drag.kind === 'draw') {
      const width = Math.abs(at.x - drag.origin.x);
      const height = Math.abs(at.y - drag.origin.y);
      if (!drag.started && width < DRAW_THRESHOLD && height < DRAW_THRESHOLD) {
        return; // still within a click's worth of movement
      }
      drag.started = true;
      actions.crop.setRect(
        clampRect({
          x: Math.min(drag.origin.x, at.x),
          y: Math.min(drag.origin.y, at.y),
          width: Math.max(1, width),
          height: Math.max(1, height),
        })
      );
      return;
    }

    // resize: each grip moves the edges it is named for, leaving the opposite
    // ones where they are
    const start = drag.start;
    let left = start.x;
    let top = start.y;
    let right = start.x + start.width;
    let bottom = start.y + start.height;
    if (drag.grip.left) {
      left = Math.min(at.x, right - 1);
    }
    if (drag.grip.right) {
      right = Math.max(at.x, left + 1);
    }
    if (drag.grip.top) {
      top = Math.min(at.y, bottom - 1);
    }
    if (drag.grip.bottom) {
      bottom = Math.max(at.y, top + 1);
    }
    actions.crop.setRect(clampRect({ x: left, y: top, width: right - left, height: bottom - top }));
  };

  const endDrag = (): void => {
    dragRef.current = null;
  };

  return (
    <div
      ref={hostRef}
      className="crop-overlay"
      style={{ width: canvas.width * scale.x, height: canvas.height * scale.y }}
      onPointerDown={(event): void =>
        // on the dimmed area: arm a redraw, but leave the box as it is until
        // the pointer moves, see the 'draw' case above
        onPointerDown({ kind: 'draw', origin: pointerToCanvas(event), started: false })(event)
      }
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onContextMenu={(event): void => {
        // Right-click is the commit gesture. Taken on contextmenu rather than
        // on the button number in pointerdown because it bubbles: one handler
        // here covers the dimmed area, the box and every grip, and the same
        // call is what suppresses the browser's menu.
        event.preventDefault();
        actions.crop.apply();
      }}
    >
      <div
        className="crop-overlay__box"
        style={{
          left: toCss(rect.x, 'x'),
          top: toCss(rect.y, 'y'),
          width: toCss(rect.width, 'x'),
          height: toCss(rect.height, 'y'),
        }}
        onPointerDown={(event): void =>
          onPointerDown({ kind: 'move', grab: pointerToCanvas(event), start: rect })(event)
        }
        onDoubleClick={(): void => actions.crop.apply()}
      >
        {showHint && <span className="crop-overlay__hint">Drag handles to adjust the crop</span>}
        {GRIPS.map((grip) => (
          <span
            key={grip.id}
            className={`crop-overlay__grip crop-overlay__grip--${grip.id}`}
            style={{ cursor: grip.cursor }}
            onPointerDown={(event): void =>
              onPointerDown({ kind: 'resize', grip, start: rect })(event)
            }
          >
            <GripArrow cursor={grip.cursor} />
          </span>
        ))}
      </div>
    </div>
  );
}
