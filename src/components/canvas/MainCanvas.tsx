import React, { useEffect, useRef } from 'react';
import { Canvas } from './Canvas';
import { CanvasState, CanvasStateAction } from './CanvasState';
import { ToolbarState } from '../toolbar/ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import { useScrollToFocusPoint } from './hooks';
import './Canvas.css';

interface Props {
  canvasDispatch: React.Dispatch<CanvasStateAction>;
  canvasState: CanvasState;
  toolbarState: ToolbarState;
  paletteState: PaletteState;
}

export function MainCanvas({
  canvasDispatch,
  canvasState,
  toolbarState,
  paletteState,
}: Props): JSX.Element {
  const canvasDivRef = useRef<HTMLDivElement>(null);

  useEffect((): void => {
    canvasDispatch({
      type: 'setCanvasResolution',
      canvasResolution: { width: window.innerWidth - 50, height: window.innerHeight - 3 },
    });
  }, [canvasDispatch]);

  useScrollToFocusPoint(canvasDivRef, canvasState.scrollFocusPoint);

  return (
    <div className="MainCanvasDiv" ref={canvasDivRef}>
      <Canvas
        canvasDispatch={canvasDispatch}
        canvasState={canvasState}
        toolbarState={toolbarState}
        paletteState={paletteState}
        isZoomCanvas={false}
      />
    </div>
  );
}

export default MainCanvas;
