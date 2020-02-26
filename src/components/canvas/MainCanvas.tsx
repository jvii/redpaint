import React, { useEffect, useRef } from 'react';
import { Canvas } from './Canvas';
import { CanvasState, CanvasStateAction } from './CanvasState';
import { useScrollToFocusPoint } from './hooks';
import { useOvermind } from '../../overmind';
import './Canvas.css';

interface Props {
  canvasDispatch: React.Dispatch<CanvasStateAction>;
  canvasState: CanvasState;
}

export function MainCanvas({ canvasDispatch, canvasState }: Props): JSX.Element {
  const canvasDivRef = useRef<HTMLDivElement>(document.createElement('div'));

  const { state, actions } = useOvermind();

  useScrollToFocusPoint(canvasDivRef.current, state.canvas.scrollFocusPoint);

  useEffect((): void => {
    actions.canvas.setResolution({
      width: window.innerWidth - 72,
      height: window.innerHeight - 30,
    });
  }, [canvasDispatch]);

  // set initial undo point
  useEffect((): void => {
    actions.undo.setUndoPoint(canvasState.mainCanvas);
  }, [canvasState.mainCanvas]);

  return (
    <div className="main-canvas-div" ref={canvasDivRef}>
      <Canvas canvasDispatch={canvasDispatch} isZoomCanvas={false} />
    </div>
  );
}

export default MainCanvas;
