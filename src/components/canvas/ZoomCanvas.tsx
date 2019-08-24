import React, { useState, useRef } from 'react';
import { Canvas } from './Canvas';
import { CanvasState, CanvasStateAction } from './CanvasState';
import { ToolbarState } from '../toolbar/ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import { useScrollToFocusPoint } from './hooks';
import { Point } from '../../types';
import './Canvas.css';

interface Props {
  canvasDispatch: React.Dispatch<CanvasStateAction>;
  canvasState: CanvasState;
  toolbarState: ToolbarState;
  paletteState: PaletteState;
}

export const ZoomCanvas = ({
  canvasDispatch,
  canvasState,
  toolbarState,
  paletteState,
}: Props): JSX.Element => {
  const canvasDivRef = useRef<HTMLDivElement>(null);
  const [zoomFactor, setZoomFactor] = useState(20);

  useScrollToFocusPoint(canvasDivRef, canvasState.zoomFocusPoint, zoomFactor);

  const updateZoomFocusPoint = (): void => {
    if (canvasDivRef === null || canvasDivRef.current === null) {
      return;
    }
    canvasDispatch({
      type: 'setZoomFocusPoint',
      point: getDivFocusPoint(canvasDivRef.current, zoomFactor),
    });
  };

  const updateScrollFocusPoint = (): void => {
    if (canvasDivRef === null || canvasDivRef.current === null) {
      return;
    }
    canvasDispatch({
      type: 'setScrollFocusPoint',
      point: getDivFocusPoint(canvasDivRef.current, zoomFactor),
    });
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

  const visible = toolbarState.zoomModeOn && canvasState.zoomFocusPoint;

  return (
    <>
      <div className="ZoomCanvasSideBar" style={{ display: visible ? 'initial' : 'none' }}>
        <button className="ButtonPlus" onClick={zoomIn}>
          +
        </button>
        <button className="ButtonMinus" onClick={zoomOut}>
          -
        </button>
      </div>
      <div
        className="ZoomCanvasDiv"
        ref={canvasDivRef}
        onScroll={updateScrollFocusPoint}
        style={{ display: visible ? 'initial' : 'none' }}
      >
        <Canvas
          canvasDispatch={canvasDispatch}
          canvasState={canvasState}
          toolbarState={toolbarState}
          paletteState={paletteState}
          isZoomCanvas={true}
          zoomFactor={zoomFactor}
        />
      </div>
    </>
  );
};

function getDivFocusPoint(div: HTMLDivElement, zoomFactor: number): Point {
  return {
    x: (div.scrollLeft + div.clientWidth / 2) / zoomFactor,
    y: (div.scrollTop + div.clientHeight / 2) / zoomFactor,
  };
}

export default ZoomCanvas;
