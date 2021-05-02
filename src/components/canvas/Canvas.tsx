import React, { useEffect, useRef } from 'react';
import { CanvasStateAction } from './CanvasState';
import { useInitTool, useUndo, useFillStyle } from './hooks';
import { useOvermind } from '../../overmind';
import { getEventHandler, getEventHandlerOverlay } from '../../tools/util/util';
import { EventHandlerParams, EventHandlerParamsOverlay } from '../../tools/Tool';
import './Canvas.css';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';

interface Props {
  canvasDispatch: React.Dispatch<CanvasStateAction>;
  isZoomCanvas: boolean;
  zoomFactor?: number;
}

export function Canvas({
  canvasDispatch,
  isZoomCanvas,
  zoomFactor = 1,
}: Props): JSX.Element | null {
  console.log('render ' + (isZoomCanvas ? 'ZoomCanvas' : 'MainCanvas'));
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const overlayCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const paintingCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const overlay2CanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  useEffect((): void => {
    canvasDispatch({
      type: isZoomCanvas ? 'setZoomCanvas' : 'setMainCanvas',
      elements: { canvas: canvasRef.current, overlay: overlayCanvasRef.current },
    });
    if (isZoomCanvas) {
      paintingCanvasController.attachZoomCanvas(paintingCanvasRef.current);
      overlayCanvasController.attachZoomCanvas(overlay2CanvasRef.current);
    } else {
      paintingCanvasController.attachMainCanvas(paintingCanvasRef.current);
      overlayCanvasController.attachMainCanvas(overlay2CanvasRef.current);
    }
  }, []);

  const canvasCtx = canvasRef.current.getContext('2d', {
    alpha: false,
    desynchronized: false, // desynchronized caused various problems with Windows version of Chrome
  }) as CanvasRenderingContext2D | null;

  const overlayCanvasCtx = overlayCanvasRef.current.getContext('2d', {
    alpha: true,
    desynchronized: false, // desynchronized caused various problems with Windows version of Chrome
  }) as CanvasRenderingContext2D | null;

  const { state, actions } = useOvermind();

  const eventHandlerParams: EventHandlerParams = {
    ctx: canvasCtx!,
    undoPoint: (): void => {
      actions.undo.setUndoPoint();
    },
  };
  const eventHandlerParamsOverlay: EventHandlerParamsOverlay = {
    ctx: overlayCanvasCtx!,
  };

  useUndo();
  useInitTool(eventHandlerParams, eventHandlerParamsOverlay, isZoomCanvas);

  useFillStyle(canvasCtx);
  useFillStyle(overlayCanvasCtx);

  if (!canvasCtx || !overlayCanvasCtx) {
    return null; // no render
  }

  const tool = state.toolbox.activeTool;

  const CSSZoom = {
    width: state.canvas.resolution.width * zoomFactor,
    height: state.canvas.resolution.height * zoomFactor,
  };

  return (
    <>
      <canvas
        className="canvas"
        ref={canvasRef}
        width={state.canvas.resolution.width}
        height={state.canvas.resolution.height}
        style={CSSZoom}
        onClick={(event): void => {
          getEventHandler(tool, 'onClick', eventHandlerParams)(event);
          getEventHandlerOverlay(tool, 'onClickOverlay', eventHandlerParamsOverlay)(event);
        }}
        onMouseDown={(event): void => {
          getEventHandler(tool, 'onMouseDown', eventHandlerParams)(event);
          getEventHandlerOverlay(tool, 'onMouseDownOverlay', eventHandlerParamsOverlay)(event);
        }}
        onMouseUp={(event): void => {
          getEventHandler(tool, 'onMouseUp', eventHandlerParams)(event);
          getEventHandlerOverlay(tool, 'onMouseUpOverlay', eventHandlerParamsOverlay)(event);
        }}
        onMouseEnter={(event): void => {
          getEventHandler(tool, 'onMouseEnter', eventHandlerParams)(event);
          getEventHandlerOverlay(tool, 'onMouseEnterOverlay', eventHandlerParamsOverlay)(event);
        }}
        onMouseLeave={(event): void => {
          getEventHandler(tool, 'onMouseLeave', eventHandlerParams)(event);
          getEventHandlerOverlay(tool, 'onMouseLeaveOverlay', eventHandlerParamsOverlay)(event);
        }}
        onMouseMove={(event): void => {
          getEventHandler(tool, 'onMouseMove', eventHandlerParams)(event);
          getEventHandlerOverlay(tool, 'onMouseMoveOverlay', eventHandlerParamsOverlay)(event);
        }}
        onContextMenu={getEventHandler(tool, 'onContextMenu', eventHandlerParams)}
      />
      <canvas
        className="canvas canvas--overlay"
        ref={paintingCanvasRef}
        width={state.canvas.resolution.width}
        height={state.canvas.resolution.height}
        style={CSSZoom}
      />
      <canvas
        className="canvas canvas--overlay"
        ref={overlay2CanvasRef}
        width={state.canvas.resolution.width}
        height={state.canvas.resolution.height}
        style={CSSZoom}
      />
      <canvas
        className="canvas canvas--overlay"
        ref={overlayCanvasRef}
        width={state.canvas.resolution.width}
        height={state.canvas.resolution.height}
        style={CSSZoom}
      />
    </>
  );
}
