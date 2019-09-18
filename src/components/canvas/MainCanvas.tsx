import React, { useEffect, useRef } from 'react';
import { Canvas } from './Canvas';
import { CanvasState, CanvasStateAction } from './CanvasState';
import { PaletteState } from '../palette/PaletteState';
import { useScrollToFocusPoint } from './hooks';
import { useOvermind } from '../../overmind';
import './Canvas.css';

interface Props {
  canvasDispatch: React.Dispatch<CanvasStateAction>;
  canvasState: CanvasState;
  paletteState: PaletteState;
}

export function MainCanvas({ canvasDispatch, canvasState, paletteState }: Props): JSX.Element {
  const canvasDivRef = useRef<HTMLDivElement>(document.createElement('div'));

  const { state, actions } = useOvermind();

  useScrollToFocusPoint(canvasDivRef.current, state.canvas.scrollFocusPoint);

  useEffect((): void => {
    actions.canvas.setResolution({ width: window.innerWidth - 50, height: window.innerHeight - 3 });
  }, [canvasDispatch]);

  // set initial undo point
  useEffect((): void => {
    actions.undo.setUndoPoint(canvasState.mainCanvas);
  }, [canvasState.mainCanvas]);

  return (
    <div className="MainCanvasDiv" ref={canvasDivRef}>
      <Canvas
        canvasDispatch={canvasDispatch}
        canvasState={canvasState}
        paletteState={paletteState}
        isZoomCanvas={false}
      />
    </div>
  );
}

export default MainCanvas;
