import React, { useEffect, useRef } from 'react';
import { Canvas } from './Canvas';
import { CanvasState, CanvasStateAction } from './CanvasState';
import { useScrollToFocusPoint, useLoadedImage } from './hooks';
import { useOvermind } from '../../overmind';
import { clearCanvas } from '../../tools/util/util';
import './Canvas.css';

interface Props {
  canvasDispatch: React.Dispatch<CanvasStateAction>;
  canvasState: CanvasState;
}

export function MainCanvas({ canvasDispatch, canvasState }: Props): JSX.Element {
  const canvasDivRef = useRef<HTMLDivElement>(document.createElement('div'));

  const { state, actions } = useOvermind();

  useScrollToFocusPoint(canvasDivRef.current, state.canvas.scrollFocusPoint);

  // set initial canvas size according to initial window size
  useEffect((): void => {
    actions.canvas.setResolution({
      width: canvasDivRef.current.offsetWidth,
      height: canvasDivRef.current.offsetHeight,
    });
  }, []);

  /*   // set initial undo point
  useEffect((): void => {
    console.log('initial undopoint');
    clearCanvas(canvasState.mainCanvas, state.palette.backgroundColor);
    if (state.undo.currentIndex === null) {
      actions.undo.setUndoPoint(canvasState.mainCanvas);
    }
  }, [canvasState.mainCanvas]); */

  // handle drawing newly loaded image to canvas
  useLoadedImage(canvasState.mainCanvas);

  return (
    <div className="main-canvas-div" ref={canvasDivRef}>
      <Canvas canvasDispatch={canvasDispatch} isZoomCanvas={false} />
    </div>
  );
}

export default MainCanvas;
