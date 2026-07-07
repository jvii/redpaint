import React, { useState, useRef, JSX } from 'react';
import { Canvas } from './Canvas';
import { useRefreshZoomCanvas, useScrollToFocusPoint } from './hooks';
import { useActions, useAppState } from '../../overmind';
import { Point } from '../../types';
import './Canvas.css';

export function ZoomCanvas(): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  const canvasDivRef = useRef<HTMLDivElement>(document.createElement('div'));
  const [zoomFactor, setZoomFactor] = useState(20);

  // page-pixel to CSS-pixel scale, per axis: the zoom magnification times
  // the active screen format's pixel aspect
  const scale: Point = {
    x: zoomFactor * state.canvas.pixelAspect.x,
    y: zoomFactor * state.canvas.pixelAspect.y,
  };

  useScrollToFocusPoint(canvasDivRef.current, state.canvas.zoomFocusPoint, scale);
  useRefreshZoomCanvas(state.toolbox.zoomModeOn);

  const updateZoomFocusPoint = (): void => {
    actions.canvas.setZoomFocusPoint(getDivFocusPoint(canvasDivRef.current, scale));
  };
  const updateScrollFocusPoint = (): void => {
    actions.canvas.setScrollFocusPoint(getDivFocusPoint(canvasDivRef.current, scale));
  };

  const zoomIn = (): void => {
    const newZoomFactor = zoomFactor + 2;
    zoom(newZoomFactor);
  };
  const zoomOut = (): void => {
    const newZoomFactor = zoomFactor - 2;
    zoom(newZoomFactor);
  };
  const zoom = (newZoomFactor: number): void => {
    if (newZoomFactor <= 0) {
      return;
    }
    setZoomFactor(newZoomFactor);
    updateZoomFocusPoint();
  };

  const visible = state.toolbox.zoomModeOn;

  return (
    <>
      <div className="zoom-canvas-separator" style={{ display: visible ? 'initial' : 'none' }}>
        <button className="zoom-canvas-separator__button-plus" onClick={zoomIn}>
          +
        </button>
        <button className="zoom-canvas-separator__button-minus" onClick={zoomOut}>
          -
        </button>
      </div>
      <div
        className="zoom-canvas-div"
        ref={canvasDivRef}
        onScroll={updateScrollFocusPoint}
        style={{ display: visible ? 'initial' : 'none' }}
      >
        <Canvas isZoomCanvas={true} displayScale={scale} />
      </div>
    </>
  );
}

function getDivFocusPoint(div: HTMLDivElement, scale: Point): Point {
  return {
    x: (div.scrollLeft + div.clientWidth / 2) / scale.x,
    y: (div.scrollTop + div.clientHeight / 2) / scale.y,
  };
}

export default ZoomCanvas;
