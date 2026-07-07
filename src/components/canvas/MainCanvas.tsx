import React, { JSX, useEffect, useRef, useState } from 'react';
import { Canvas } from './Canvas';
import { useLoadedImage, useScrollToFocusPoint } from './hooks';
import { useActions, useAppState } from '../../overmind';
import { screenFormats } from '../../overmind/canvas/state';
import { Point } from '../../types';
import './Canvas.css';

export function MainCanvas(): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  const canvasDivRef = useRef<HTMLDivElement>(document.createElement('div'));

  // The screen-format display scale: CSS pixels per buffer pixel, per axis.
  // A format fills the window on both axes independently (pixels need not stay
  // square). The scale mode decides the trade-off:
  //  - 'stretch' uses the exact fractional scale, filling the window with no
  //    margin but non-uniform pixel blocks (the cursor's pixel drifts a little
  //    as you move); its floor is one CSS pixel per screen pixel (= aspect).
  //  - 'integer' floors to whole CSS pixels per buffer pixel, so every pixel
  //    is a uniform block (no cursor drift) at the cost of black margin on the
  //    right/bottom until the window is enlarged; its floor is 1.
  // {1,1} while no format is active (page shown 1:1, the startup behavior).
  // Window resizes recompute the scale; the page and painting are untouched.
  const formatId = state.canvas.screenFormatId;
  const scaleMode = state.canvas.scaleMode;
  const [displayScale, setDisplayScale] = useState<Point>({ x: 1, y: 1 });
  useEffect((): (() => void) | void => {
    if (formatId === null) {
      setDisplayScale({ x: 1, y: 1 });
      return;
    }
    const format = screenFormats[formatId];
    const compute = (): void => {
      const div = canvasDivRef.current;
      // offsetWidth/Height (border box), not clientWidth/Height (content box):
      // while shrinking the window the still-oversized canvas briefly overflows
      // and the div shows a scrollbar, which eats into the content box. Reading
      // clientWidth then would size the canvas ~a scrollbar short; the canvas
      // shrinks, the scrollbar vanishes, and that short size is left as a stale
      // margin with no further resize event to correct it. The border box is
      // unaffected by the transient scrollbar, so the canvas fills exactly.
      const fillX = div.offsetWidth / format.width;
      const fillY = div.offsetHeight / format.height;
      if (scaleMode === 'integer') {
        setDisplayScale({
          x: Math.max(1, Math.floor(fillX)),
          y: Math.max(1, Math.floor(fillY)),
        });
      } else {
        setDisplayScale({
          x: Math.max(format.aspectX, fillX),
          y: Math.max(format.aspectY, fillY),
        });
      }
    };
    compute();
    window.addEventListener('resize', compute);
    return (): void => window.removeEventListener('resize', compute);
  }, [formatId, scaleMode]);

  useScrollToFocusPoint(canvasDivRef.current, state.canvas.scrollFocusPoint, displayScale);
  useLoadedImage();

  // set initial canvas size according to initial window size

  useEffect((): void => {
    actions.canvas.setResolution({
      width: canvasDivRef.current.offsetWidth,
      height: canvasDivRef.current.offsetHeight,
    });
  }, []);

  return (
    <div className="main-canvas-div" ref={canvasDivRef}>
      <Canvas isZoomCanvas={false} displayScale={displayScale} />
    </div>
  );
}

export default MainCanvas;
