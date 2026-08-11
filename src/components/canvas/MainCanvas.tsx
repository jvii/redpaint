import React, { JSX, useEffect, useRef, useState } from 'react';
import { Canvas } from './Canvas';
import { useCanvasContentUpload, useDevicePixelRatio, useScrollToFocusPoint } from './hooks';
import { useActions, useAppState } from '../../overmind';
import { resolveScreenFormat } from '../../overmind/canvas/state';
import { Point } from '../../types';
import { restoreSettled } from '../../persistence/restoreSettled';
import './Canvas.css';

// The drawing pane measured in physical pixels, for a canvas that must fit
// inside it.
//
// getBoundingClientRect and floor, not offsetWidth and round. offsetWidth is an
// integer, so a pane 1417.6 CSS pixels wide reports 1418 — and a canvas built
// to that is wider than the pane it lives in, which is a scrollbar. Safari lands
// on fractional pane widths where Chrome does not, so it was Safari that showed
// it, intermittently, depending on the window. Flooring the product means the
// canvas can fall up to a physical pixel short of the pane and never a pixel
// over: a hairline of pasteboard nobody sees, against a scrollbar everybody does.
//
// Deliberately not subtracting a visible scrollbar's width (offsetWidth minus
// clientWidth). It would be the more complete measurement and it oscillates:
// take the scrollbar's width off, the canvas fits, the scrollbar goes, the pane
// gains that width back, the observer fires, and the canvas grows into a
// scrollbar again. Not producing the scrollbar in the first place is what stops
// that, and flooring is what does it.
//
// The scrollbar gutter comes off, because these are 15px space-taking
// scrollbars (.retro-scrollbar in index.css), and getBoundingClientRect is the
// border box — which includes the gutter. Sizing the canvas to that while a
// scrollbar is up gets stuck: the canvas is exactly a gutter too wide for the
// content box, which keeps the scrollbar, which keeps it too wide. Measured in
// Safari mid-symptom: pane border box 2010, content box 1995, canvas 2010,
// overflow 15 in both directions and no other element past the edge.
//
// Not a loop, though it reads like one. Subtracting the gutter fits the canvas
// inside the scrollbar, the scrollbar goes, the pane gains that width back, the
// observer fires, and the canvas is then exactly the pane — which needs no
// scrollbar, so it stops there. The gutter is 0 in the ordinary case, so the
// fit is unaffected by any of this until a scrollbar is actually up.
function paneSize(pane: HTMLElement, dpr: number): { width: number; height: number } {
  const rect = pane.getBoundingClientRect();
  const gutterX = pane.offsetWidth - pane.clientWidth;
  const gutterY = pane.offsetHeight - pane.clientHeight;
  return {
    width: Math.floor((rect.width - gutterX) * dpr),
    height: Math.floor((rect.height - gutterY) * dpr),
  };
}

export function MainCanvas(): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  const canvasDivRef = useRef<HTMLDivElement>(document.createElement('div'));
  const dpr = useDevicePixelRatio();

  // The screen-format display scale: CSS pixels per buffer pixel, per axis.
  // A format fills the window on both axes independently (pixels need not stay
  // square). The scale mode decides the trade-off:
  //  - 'stretch' uses the exact fractional scale, filling the window with no
  //    margin but non-uniform pixel blocks (the cursor's pixel drifts a little
  //    as you move); its floor is one CSS pixel per screen pixel (= aspect).
  //  - 'integer' floors to whole CSS pixels per buffer pixel, so every pixel
  //    is a uniform block (no cursor drift) at the cost of black margin on the
  //    right/bottom until the window is enlarged; its floor is 1.
  // While no format is active (the startup behavior), the canvas should show
  // artwork pixels at their true physical size — one artwork pixel per screen
  // pixel, like a native image viewer's 100% view — rather than at whatever
  // size the host's OS display scaling happens to stretch a CSS pixel to, so
  // this divides by devicePixelRatio instead of using a flat {1,1}.
  // Window resizes recompute the scale; the page and painting are untouched.
  const formatId = state.canvas.screenFormatId;
  const scaleMode = state.canvas.scaleMode;
  const videoStandard = state.canvas.videoStandard;
  const [displayScale, setLocalDisplayScale] = useState<Point>({ x: 1, y: 1 });
  // Also mirrored into Overmind (state.canvas.displayScale) so other UI —
  // the Fill Style dialog's live preview, sizing itself to show "an equally
  // sized window into the canvas" — can read the canvas's actual current
  // on-screen pixel density without duplicating this window-size-dependent
  // computation. Local state stays the source of truth for this component's
  // own render (no round-trip through Overmind needed for that).
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
    // The whole canvas area, not this pane: the format fills the space the
    // artwork has on screen, and opening the zoom view or dragging its
    // divider must not change how big a pixel is — that would rescale the
    // picture under the user mid-edit, where Native (a fixed scale) instead
    // just shows less of it and scrolls. The main pane simply overflows and
    // scrolls once the zoom view takes its half.
    const area = canvasDivRef.current.parentElement ?? canvasDivRef.current;
    const compute = (): void => {
      // offsetWidth/Height (border box), not clientWidth/Height (content box):
      // while shrinking the window the still-oversized canvas briefly overflows
      // and the div shows a scrollbar, which eats into the content box. Reading
      // clientWidth then would size the canvas ~a scrollbar short; the canvas
      // shrinks, the scrollbar vanishes, and that short size is left as a stale
      // margin with no further resize event to correct it. The border box is
      // unaffected by the transient scrollbar, so the canvas fills exactly.
      const fillX = area.offsetWidth / format.width;
      const fillY = area.offsetHeight / format.height;
      if (scaleMode === 'integer') {
        updateDisplayScale({
          x: Math.max(1, Math.floor(fillX)),
          y: Math.max(1, Math.floor(fillY)),
        });
      } else {
        updateDisplayScale({
          x: Math.max(format.aspectX, fillX),
          y: Math.max(format.aspectY, fillY),
        });
      }
    };
    compute();
    // A ResizeObserver on the canvas area rather than a window resize
    // listener: the area also changes when the chrome around it does (the
    // UI Size setting rescales the toolbox column), and it deliberately does
    // not change when the zoom divider moves, so the split never re-fits the
    // canvas.
    const observer = new ResizeObserver(compute);
    observer.observe(area);
    return (): void => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatId, scaleMode, videoStandard, dpr]);

  // The drawing pane's own size in artwork pixels, tracked whatever the
  // screen format is — the effect above returns early at Native, and this is
  // exactly the case that needs it. Feeds the Canvas Size requester's fit
  // option; the same measurement the startup sizing below performs once.
  useEffect((): (() => void) => {
    const pane = canvasDivRef.current;
    const measure = (): void => actions.canvas.setViewportSize(paneSize(pane, dpr));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pane);
    return (): void => observer.disconnect();
    // Re-measured on every resolution change as well as on resize, because a
    // scrollbar appearing is the case that matters here and the observer does
    // not report it: it watches the pane's own box, and a canvas outgrowing the
    // pane changes what is *inside* it. Verified — oversize the canvas and the
    // gutter goes to 15 while the stored measurement stays at its no-scrollbar
    // value, which is the stale number a later fit would then use.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpr, state.canvas.resolution.width, state.canvas.resolution.height]);

  useScrollToFocusPoint(canvasDivRef.current, state.canvas.scrollFocusPoint, displayScale);
  useCanvasContentUpload();

  // Set initial canvas size according to initial window size — in physical
  // pixels (offsetWidth/Height times dpr), not CSS pixels, so the freshly
  // initialized canvas has one artwork pixel per physical screen pixel here
  // too (see the displayScale comment above).
  //
  // Tracked while the canvas is still blank rather than measured once at mount:
  // React mounts after `load` and before the chrome around the pane has
  // settled, so no page event marks the moment this number is final — only the
  // pane itself does. A size measured too early is wrong for the whole session.
  //
  // It stops at the first click or keypress. From then on the size is the
  // document's and changes only through the Canvas Size requester or a crop —
  // at Native the canvas is the paper, not a view of it, so following the
  // window would crop or pad the picture. setStartupResolution refuses in every
  // other case where the canvas has stopped being a blank startup one.
  //
  // And it does not start until the restore has answered, because a saved
  // record carries its own size and there is nothing to fit when one is coming
  // back. The two used to run concurrently and be refereed inside
  // setStartupResolution, where the fit could win and re-init the canvas out
  // from under a restore in progress. Sequencing them means the question of who
  // decides the startup size has one answer rather than a race with a guard on
  // it (docs/autosave-simplification.md §4). It costs a read that measured
  // 10-25ms for a 4.6MB record.
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
