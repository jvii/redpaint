import React, { useEffect, useRef } from 'react';
import { Canvas } from './Canvas';
import { CanvasState, CanvasStateAction } from './CanvasState';
import { useScrollToFocusPoint, useLoadedImage } from './hooks';
import { useOvermind } from '../../overmind';
import './Canvas.css';
import { clearCanvas } from '../../tools/util/util';

interface Props {
  canvasDispatch: React.Dispatch<CanvasStateAction>;
  canvasState: CanvasState;
}

export function MainCanvas({ canvasDispatch, canvasState }: Props): JSX.Element {
  const canvasDivRef = useRef<HTMLDivElement>(document.createElement('div'));

  const { state, actions } = useOvermind();

  useScrollToFocusPoint(canvasDivRef.current, state.canvas.scrollFocusPoint);

  // set initial canvas size (to window size)
  useEffect((): void => {
    actions.canvas.setResolution({
      width: window.innerWidth - 72,
      height: window.innerHeight - 46,
    });
  }, [canvasDispatch]);

  // set initial undo point
  useEffect((): void => {
    clearCanvas(canvasState.mainCanvas, state.palette.backgroundColor);
    actions.undo.setUndoPoint(canvasState.mainCanvas);
  }, [canvasState.mainCanvas]);

  // handle drawing newly loaded image to canvas
  useLoadedImage(canvasState.mainCanvas);

  return (
    <div className="main-canvas-div" ref={canvasDivRef}>
      <Canvas canvasDispatch={canvasDispatch} isZoomCanvas={false} />
    </div>
  );
}

export default MainCanvas;
