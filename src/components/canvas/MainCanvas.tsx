import React, { useEffect, useRef } from 'react';
import { Canvas } from './Canvas';
import { useScrollToFocusPoint } from './hooks';
import { useOvermind } from '../../overmind';
import './Canvas.css';

export function MainCanvas(): JSX.Element {
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

  return (
    <div className="main-canvas-div" ref={canvasDivRef}>
      <Canvas isZoomCanvas={false} />
    </div>
  );
}

export default MainCanvas;
