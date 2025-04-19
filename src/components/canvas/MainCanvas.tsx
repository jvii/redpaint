import React, { JSX, useEffect, useRef } from 'react';
import { Canvas } from './Canvas';
import { useScrollToFocusPoint } from './hooks';
import { useActions, useAppState } from '../../overmind';
import './Canvas.css';

export function MainCanvas(): JSX.Element {
  const actions = useActions()
  
  const canvasDivRef = useRef<HTMLDivElement>(document.createElement('div'));
  useScrollToFocusPoint(canvasDivRef.current, useAppState().canvas.scrollFocusPoint);

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
