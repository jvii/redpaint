import React, { useState, useRef } from 'react';
import { Canvas } from './Canvas';
import { CanvasStateAction } from './CanvasState';
import { useScrollToFocusPoint } from './hooks';
import { useOvermind } from '../../overmind';
import { Point } from '../../types';
import './Canvas.css';

interface Props {
  canvasDispatch: React.Dispatch<CanvasStateAction>;
}

export function ZoomCanvas({ canvasDispatch }: Props): JSX.Element {
  const canvasDivRef = useRef<HTMLDivElement>(document.createElement('div'));
  const [zoomFactor, setZoomFactor] = useState(20);

  const { state, actions } = useOvermind();

  useScrollToFocusPoint(canvasDivRef.current, state.canvas.zoomFocusPoint, zoomFactor);

  const updateZoomFocusPoint = (): void => {
    actions.canvas.setZoomFocusPoint(getDivFocusPoint(canvasDivRef.current, zoomFactor));
  };
  const updateScrollFocusPoint = (): void => {
    actions.canvas.setScrollFocusPoint(getDivFocusPoint(canvasDivRef.current, zoomFactor));
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

  const visible = state.toolbox.zoomModeState === 'on';

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
        <Canvas canvasDispatch={canvasDispatch} isZoomCanvas={true} zoomFactor={zoomFactor} />
      </div>
    </>
  );
}

function getDivFocusPoint(div: HTMLDivElement, zoomFactor: number): Point {
  return {
    x: (div.scrollLeft + div.clientWidth / 2) / zoomFactor,
    y: (div.scrollTop + div.clientHeight / 2) / zoomFactor,
  };
}

export default ZoomCanvas;
