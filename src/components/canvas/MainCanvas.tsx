import React, { JSX, useEffect, useRef, useState } from 'react';
import { Canvas } from './Canvas';
import { useCanvasContentUpload, useDevicePixelRatio, useScrollToFocusPoint } from './hooks';
import { useActions, useAppState } from '../../overmind';
import { resolveScreenFormat } from '../../overmind/canvas/state';
import { Point } from '../../types';
import { restoreSettled } from '../../persistence/restoreSettled';
import './Canvas.css';

// The pane in physical pixels, for a canvas that has to fit inside it. Floored
// fractional rect rather than rounded offsetWidth, and the border box rather
// than the box minus a scrollbar currently showing: both of the other ways
// produce scrollbars (docs/gotchas.md, "Fitting the canvas to its pane").
function paneSize(pane: HTMLElement, dpr: number): { width: number; height: number } {
  const rect = pane.getBoundingClientRect();
  return {
    width: Math.floor(rect.width * dpr),
    height: Math.floor(rect.height * dpr),
  };
}

export function MainCanvas(): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  const canvasDivRef = useRef<HTMLDivElement>(document.createElement('div'));
  const dpr = useDevicePixelRatio();

  // CSS pixels per buffer pixel, per axis. A format fills the window on both
  // axes independently, so pixels need not stay square. 'stretch' takes the
  // fractional scale (no margin, the cursor's pixel drifts slightly);
  // 'aspect' takes one whole scale and applies the format's pixel shape to it
  // (uniform blocks of the right proportions, margin until the window grows).
  // At Native it is 1/dpr, so an artwork pixel is one physical pixel rather
  // than one CSS pixel.
  const formatId = state.canvas.screenFormatId;
  const scaleMode = state.canvas.scaleMode;
  const videoStandard = state.canvas.videoStandard;
  const [displayScale, setLocalDisplayScale] = useState<Point>({ x: 1, y: 1 });
  // Mirrored into Overmind for readers outside this component (the Fill Style
  // preview needs the on-screen pixel density); local state drives this render.
  const updateDisplayScale = (scale: Point): void => {
    setLocalDisplayScale(scale);
    actions.canvas.setDisplayScale(scale);
  };
  useEffect((): (() => void) | void => {
    if (formatId === null) {
      updateDisplayScale({ x: 1 / dpr, y: 1 / dpr });
      return;
    }
    const format = resolveScreenFormat(formatId, videoStandard);
    // The whole canvas area, not this pane: opening the zoom view or dragging
    // its divider must not rescale the picture mid-edit.
    const area = canvasDivRef.current.parentElement ?? canvasDivRef.current;
    const compute = (): void => {
      // Border box: a transient scrollbar shrinks the content box, and reading
      // that would leave the canvas permanently short (docs/gotchas.md).
      const fillX = area.offsetWidth / format.width;
      const fillY = area.offsetHeight / format.height;
      if (scaleMode === 'aspect') {
        // The format's pixel shape as the smallest whole block: 1x1, 1x2, 2x1.
        // One scale for both axes, so the shape is the format's however the
        // window is resized, and the largest that fits, so the margin is only
        // ever what the shape demands.
        const unit = Math.min(format.aspectX, format.aspectY);
        const blockX = format.aspectX / unit;
        const blockY = format.aspectY / unit;
        // Never below one device pixel per artwork pixel. Shrinking past that
        // does not make pixels smaller, it drops them — at 0.9 a tenth of the
        // rows and columns simply have nowhere to land. The picture scrolls
        // instead, which is what a canvas too big for the window does anyway.
        // The narrower axis is the one that hits the floor first, so it sets
        // the limit — blocks are normalized, so that axis is the scale itself.
        const floorScale = 1 / dpr / Math.min(blockX, blockY);
        const scale = Math.max(floorScale, Math.min(fillX / blockX, fillY / blockY));
        updateDisplayScale({ x: scale * blockX, y: scale * blockY });
      } else {
        updateDisplayScale({
          x: Math.max(format.aspectX, fillX),
          y: Math.max(format.aspectY, fillY),
        });
      }
    };
    compute();
    // The area, not the window: it also changes with the UI Size setting, and
    // deliberately does not when the zoom divider moves.
    const observer = new ResizeObserver(compute);
    observer.observe(area);
    return (): void => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatId, scaleMode, videoStandard, dpr]);

  // The pane's own size, tracked at every format including Native (the effect
  // above returns early there). Feeds the Canvas Size requester and the fit.
  useEffect((): (() => void) => {
    const pane = canvasDivRef.current;
    // Its parent as well as itself. The pane is flex-grow: 1 beside the zoom
    // view's sized basis, so with the zoom view open it is only part of the
    // area — and a canvas fitted to the window wants the area, since closing
    // the zoom view hands the rest straight back (see paneAreaSize).
    const area = pane.parentElement;
    const measure = (): void => {
      actions.canvas.setViewportSize(paneSize(pane, dpr));
      if (area) {
        actions.canvas.setPaneAreaSize(paneSize(area, dpr));
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pane);
    if (area) {
      observer.observe(area);
    }
    return (): void => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpr]);

  // Scrollbars latch: once one is up, a canvas sized to the pane is exactly a
  // gutter too wide for what is left and the browser never revisits it. Hiding
  // the overflow for one layout makes it decide again from scratch, and a canvas
  // that fits keeps them off (docs/gotchas.md).
  useEffect((): (() => void) => {
    const pane = canvasDivRef.current;
    const unlatch = (): void => {
      if (pane.offsetWidth === pane.clientWidth && pane.offsetHeight === pane.clientHeight) {
        return; // not scrolling; nothing to reconsider
      }
      const { scrollLeft, scrollTop } = pane;
      const overflow = pane.style.overflow;
      pane.style.overflow = 'hidden';
      void pane.offsetWidth; // force the scrollbar-free layout to happen
      pane.style.overflow = overflow;
      pane.scrollLeft = scrollLeft;
      pane.scrollTop = scrollTop;
    };
    // Twice: resolution and display scale arrive in separate updates, so the
    // next frame can still be mid-change. The later pass catches Lo-Res→Native.
    const frame = requestAnimationFrame(unlatch);
    const settled = window.setTimeout(unlatch, 250);
    return (): void => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settled);
    };
  }, [
    state.canvas.resolution.width,
    state.canvas.resolution.height,
    displayScale.x,
    displayScale.y,
  ]);

  useScrollToFocusPoint(canvasDivRef.current, state.canvas.scrollFocusPoint, displayScale);
  useCanvasContentUpload();

  // The startup size: fit the pane until the first click or keypress, after
  // which the size belongs to the document and only Canvas Size or a crop
  // changes it. Tracked rather than measured once at mount, because the chrome
  // around the pane keeps settling and no event marks the moment the number is
  // final. Measured too early it is wrong for the whole session.
  //
  // Waits on restoreSettled: a restored record brings its own size, so the two
  // never both decide it (docs/autosave-simplification.md §4).
  useEffect((): (() => void) => {
    const pane = canvasDivRef.current;
    const fitToPane = (): void =>
      actions.canvas.setStartupResolution({
        ...paneSize(pane, dpr),
      });

    let observer: ResizeObserver | null = null;
    let stopped = false;
    const stopTracking = (): void => {
      stopped = true;
      observer?.disconnect();
    };
    void restoreSettled.then((restored): void => {
      // A restored record has already set the size; nothing to fit, ever.
      if (restored || stopped) {
        return;
      }
      fitToPane();
      observer = new ResizeObserver(fitToPane);
      observer.observe(pane);
    });

    const listen: AddEventListenerOptions = { once: true, capture: true };
    window.addEventListener('pointerdown', stopTracking, listen);
    window.addEventListener('keydown', stopTracking, listen);
    return (): void => {
      stopTracking();
      window.removeEventListener('pointerdown', stopTracking, listen);
      window.removeEventListener('keydown', stopTracking, listen);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="main-canvas-div retro-scrollbar" ref={canvasDivRef}>
      <Canvas isZoomCanvas={false} displayScale={displayScale} />
    </div>
  );
}

export default MainCanvas;
