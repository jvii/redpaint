import React, { useEffect, useState, useRef, JSX } from 'react';
import { Canvas } from './Canvas';
import { useRefreshZoomCanvas, useScrollToFocusPoint } from './hooks';
import { useActions, useAppState } from '../../overmind';
import { Point } from '../../types';
import { refreshBrushPreview } from '../GlobalHotkeyManager';
import './Canvas.css';

// Magnification bounds and step for the separator's zoom gadgets. The step
// stays at the coarse 2x granularity it has always had; the ceiling is where
// one artwork pixel already fills a good part of the pane, past which the
// gadget would just keep counting up with nothing more to see.
const ZOOM_STEP = 2;
const ZOOM_MIN = 2;
const ZOOM_MAX = 64;

// Minimum spacing between wheel-driven zoom steps. Every wheel event steps,
// so the smallest flick of the wheel always does something; this only caps
// how fast a held spin or a trackpad flick can run through the range.
const WHEEL_STEP_INTERVAL_MS = 60;

// Drag-to-resize limit, in CSS px: neither pane may be squeezed below this,
// so the divider always has somewhere to be dragged back from.
const MIN_PANE_WIDTH = 120;

// The zoom pane's share of the canvas area before the divider has ever been
// dragged (the 45% CSS min-width it had when the split was fixed). Exported
// for ZoomInitialPointSelectorTool, which sizes its hover box by how much
// artwork the zoom view is about to show but cannot measure the pane itself
// (it is display:none until the point is picked).
export const DEFAULT_ZOOM_WIDTH_FRACTION = 0.45;

export function ZoomCanvas(): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  const canvasDivRef = useRef<HTMLDivElement>(document.createElement('div'));
  const [zoomFactor, setZoomFactor] = useState(6);

  // page-pixel to CSS-pixel scale, per axis: the magnification times the main
  // view's own scale, so "6x" means six times the size the artwork is
  // already being shown at, whatever that is. Relative rather than absolute
  // because a screen format sizes the main view to fill the window — Amiga
  // Lo-Res on a big window is already ~4 CSS px per artwork pixel, where an
  // absolute "2x" (2 physical px) would be a zoom *out*. At Native the main
  // scale is 1/devicePixelRatio, which is what this used to divide by
  // directly, so nothing changes there. The main view's scale also already
  // carries the format's pixel aspect, per axis.
  const displayScale = state.canvas.displayScale;
  const scale: Point = {
    x: zoomFactor * displayScale.x,
    y: zoomFactor * displayScale.y,
  };

  useScrollToFocusPoint(canvasDivRef.current, state.canvas.zoomFocusPoint, scale);
  useRefreshZoomCanvas(state.toolbox.zoomModeOn);

  // Changing magnification moves the artwork under a stationary pointer just
  // as scrolling does (see updateScrollFocusPoint), and it re-centers the
  // view on top of that. Declared after useScrollToFocusPoint so it replays
  // the pointer only once that effect has done the scrolling.
  useEffect((): void => refreshBrushPreview(), [scale.x, scale.y]);

  const updateZoomFocusPoint = (): void => {
    actions.canvas.setZoomFocusPoint(getDivFocusPoint(canvasDivRef.current, scale));
  };
  const updateScrollFocusPoint = (): void => {
    actions.canvas.setScrollFocusPoint(getDivFocusPoint(canvasDivRef.current, scale));
  };
  // The pane's own scroll handler. Scrolling slides a different artwork pixel
  // under a pointer that never moved, so the brush preview the overlay is
  // holding now points at the wrong one — and it only ever repaints on mouse
  // move. Replaying one at the pointer's own position puts it back under the
  // cursor. Not part of updateScrollFocusPoint itself: a divider drag calls
  // that too, with the pointer parked on the divider rather than on a canvas.
  const onPaneScroll = (): void => {
    updateScrollFocusPoint();
    refreshBrushPreview();
  };

  const zoomIn = (): void => zoom(zoomFactor + ZOOM_STEP);
  const zoomOut = (): void => zoom(zoomFactor - ZOOM_STEP);
  const zoom = (newZoomFactor: number): void => {
    // clamped, not rejected: a wheel flick can ask for several steps at once
    // and should land on the limit rather than be dropped for overshooting
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newZoomFactor));
    if (clamped === zoomFactor) {
      return;
    }
    setZoomFactor(clamped);
    updateZoomFocusPoint();
  };

  // The pane width stays null until the divider is first dragged, so the
  // initial split is a percentage that follows the window rather than a
  // pixel width frozen at whatever size the window had at mount.
  const [zoomWidth, setZoomWidth] = useState<number | null>(null);
  const separatorRef = useRef<HTMLDivElement>(null);

  // Alt+wheel over the zoom pane or its divider zooms — Ctrl+wheel, the
  // other convention, is the browser's own page zoom on every platform and
  // can't be taken over. A native listener with passive: false, because
  // React registers its own onWheel at the root as passive, where
  // preventDefault is a no-op and the pane would scroll as well as zoom.
  //
  // Every event steps, throttled by time rather than by accumulated delta:
  // how much travel one notch reports varies wildly (macOS applies wheel
  // acceleration, and a trackpad sends streams of single-digit deltas), so
  // any distance threshold either eats a slow notch or lets a flick run away.
  // Only the sign of deltaY is read, which no input device disagrees about.
  const lastWheelStepTime = useRef(0);
  useEffect((): (() => void) => {
    const onWheel = (event: WheelEvent): void => {
      if (!event.altKey) {
        return;
      }
      event.preventDefault();
      const now = performance.now();
      if (event.deltaY === 0 || now - lastWheelStepTime.current < WHEEL_STEP_INTERVAL_MS) {
        return;
      }
      lastWheelStepTime.current = now;
      // wheel up is a negative deltaY, and up means zoom in
      zoom(zoomFactor + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    };
    const targets = [canvasDivRef.current, separatorRef.current].filter(
      (target): target is HTMLDivElement => target !== null
    );
    targets.forEach((target): void =>
      target.addEventListener('wheel', onWheel, { passive: false })
    );
    return (): void =>
      targets.forEach((target): void => target.removeEventListener('wheel', onWheel));
  });

  // Dragging the divider resizes the zoom pane against the main one. The
  // move/up listeners go on the window, not the grip, so the drag survives
  // the pointer crossing onto either canvas (which take mouse events for
  // painting) or leaving the window entirely. One setState per pointermove
  // only re-lays-out two flex items — neither canvas's drawing buffer
  // depends on the split, so nothing is re-rendered on the GL side.
  const onGripPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    const separator = separatorRef.current;
    const container = separator?.parentElement;
    if (!separator || !container) {
      return;
    }
    event.preventDefault();
    // The panes slide sideways under a pointer that is only moving along the
    // divider, so a canvas repeatedly passes beneath it and takes an enter/
    // move — which shows the brush crosshair for as long as it stays there,
    // flickering it in and out through the drag. The class turns the canvases
    // deaf and pins the resize cursor for the duration (Canvas.css).
    document.body.classList.add('zoom-divider-dragging');
    const startX = event.clientX;
    const startWidth = canvasDivRef.current.offsetWidth;
    const maxWidth = container.clientWidth - separator.offsetWidth - MIN_PANE_WIDTH;
    const onMove = (moveEvent: PointerEvent): void => {
      // the zoom pane is the right-hand one, so dragging left (a smaller
      // clientX) grows it by exactly what the main pane gives up
      const width = startWidth - (moveEvent.clientX - startX);
      setZoomWidth(Math.max(MIN_PANE_WIDTH, Math.min(maxWidth, width)));
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      // The app-drawn cursors are shown and hidden by the canvas's own mouse
      // handlers (Canvas.tsx), which the drag has been suppressing — so one
      // is left flagged visible at wherever the pointer last crossed a
      // canvas, and uncovering it now would put a stale crosshair on the
      // canvas while the real pointer sits on the divider: two cursors. Hide
      // them with the class, not after it; the next real move over a canvas
      // brings the right one back.
      hideAppDrawnCursors();
      document.body.classList.remove('zoom-divider-dragging');
      // the pane is a different width, so a different artwork pixel sits at
      // its center — keep the focus point the main view scrolls to honest
      updateScrollFocusPoint();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const visible = state.toolbox.zoomModeOn;

  return (
    <>
      <div
        className="zoom-canvas-separator"
        ref={separatorRef}
        style={{ display: visible ? 'flex' : 'none' }}
      >
        {/* One group of four, ordered by magnification: the two ends bracket
            the two steps, so up is always more zoom whichever gadget you
            reach for. */}
        <div className="zoom-canvas-separator__gadgets">
          <button
            className="zoom-canvas-separator__gadget"
            onClick={(): void => zoom(ZOOM_MAX)}
            disabled={zoomFactor === ZOOM_MAX}
            title={`Zoom To Maximum (${ZOOM_MAX}x)`}
            type="button"
          >
            <ToMaxIcon />
          </button>
          <button
            className="zoom-canvas-separator__gadget"
            onClick={zoomIn}
            disabled={zoomFactor + ZOOM_STEP > ZOOM_MAX}
            title="Zoom In (Alt+Wheel)"
            type="button"
          >
            <PlusIcon />
          </button>
          <button
            className="zoom-canvas-separator__gadget"
            onClick={zoomOut}
            disabled={zoomFactor - ZOOM_STEP < ZOOM_MIN}
            title="Zoom Out (Alt+Wheel)"
            type="button"
          >
            <MinusIcon />
          </button>
          <button
            className="zoom-canvas-separator__gadget"
            onClick={(): void => zoom(ZOOM_MIN)}
            disabled={zoomFactor === ZOOM_MIN}
            title={`Zoom To Minimum (${ZOOM_MIN}x)`}
            type="button"
          >
            <ToMinIcon />
          </button>
        </div>
        <div className="zoom-canvas-separator__factor">{zoomFactor}x</div>
        <div
          className="zoom-canvas-separator__grip"
          onPointerDown={onGripPointerDown}
          title="Drag to resize the zoom view"
        />
      </div>
      <div
        className="zoom-canvas-div retro-scrollbar"
        ref={canvasDivRef}
        onScroll={onPaneScroll}
        style={{
          display: visible ? 'initial' : 'none',
          flexBasis:
            zoomWidth === null ? `${DEFAULT_ZOOM_WIDTH_FRACTION * 100}%` : `${zoomWidth}px`,
        }}
      >
        <Canvas isZoomCanvas={true} displayScale={scale} />
      </div>
    </>
  );
}

// Action glyphs for the zoom gadgets, same register as transformIcons.tsx
// (docs/style-guide.md): currentColor stroke, 2px, square caps, so they
// follow the gadget's own hover/pressed/disabled color for free.
const glyph = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'square' as const,
  'aria-hidden': true,
  focusable: false,
};

function PlusIcon(): JSX.Element {
  return (
    <svg {...glyph}>
      <line x1="8" y1="4" x2="8" y2="12" />
      <line x1="4" y1="8" x2="12" y2="8" />
    </svg>
  );
}

function MinusIcon(): JSX.Element {
  return (
    <svg {...glyph}>
      <line x1="4" y1="8" x2="12" y2="8" />
    </svg>
  );
}

// An arrow travelling into a bar: the conventional "go all the way to the
// end" glyph, pointing the same way its gadget moves the magnification.
function ToMaxIcon(): JSX.Element {
  return (
    <svg {...glyph}>
      <line x1="3" y1="3" x2="13" y2="3" />
      <line x1="8" y1="13" x2="8" y2="7" />
      <polyline points="4,11 8,7 12,11" />
    </svg>
  );
}

function ToMinIcon(): JSX.Element {
  return (
    <svg {...glyph}>
      <line x1="3" y1="13" x2="13" y2="13" />
      <line x1="8" y1="3" x2="8" y2="9" />
      <polyline points="4,5 8,9 12,5" />
    </svg>
  );
}

// The brush crosshair and the transform resize indicator: elements Canvas.tsx
// owns and positions through a ref (never React state, so it can track the
// mouse without a re-render), which is also why they are reached here through
// the DOM rather than through props.
function hideAppDrawnCursors(): void {
  document
    .querySelectorAll<HTMLElement>('.canvas-cursor, .canvas-resize-cursor')
    .forEach((cursor): void => {
      cursor.style.visibility = 'hidden';
    });
}

function getDivFocusPoint(div: HTMLDivElement, scale: Point): Point {
  return {
    x: (div.scrollLeft + div.clientWidth / 2) / scale.x,
    y: (div.scrollTop + div.clientHeight / 2) / scale.y,
  };
}

export default ZoomCanvas;
