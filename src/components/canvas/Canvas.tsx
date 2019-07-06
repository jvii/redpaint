import React, { useState, useRef, useEffect } from 'react';
import { useTool } from '../../tools/Tool';
import { Point, PointerState } from '../../types';
import { Action } from './CanvasState';
import { ToolbarState } from '../toolbar/ToolbarState';
import { PaletteState } from '../palette/PaletteState';
import './Canvas.css';

interface Props {
  dispatch: React.Dispatch<Action>;
  toolbarState: ToolbarState;
  paletteState: PaletteState;
}

function Canvas({ dispatch, toolbarState, paletteState }: Props): JSX.Element {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [previousPosition, setPreviousPosition] = useState<Point | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Point | null>(null);

  const canvasRef = useRef(null);
  useEffect((): void => {
    dispatch({ type: 'setCanvasRef', canvasRef: canvasRef });
  }, [canvasRef]);

  const pointerState: PointerState = {
    isMouseDown: isMouseDown,
    previousPosition: previousPosition,
    currentPosition: currentPosition,
  };

  useTool(toolbarState.selectedTool, paletteState.foregroundColor, pointerState, canvasRef.current);

  function onMouseDown(): void {
    setIsMouseDown(true);
  }

  function onMouseMove(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
    const position: Point = {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    };
    setPreviousPosition(currentPosition);
    setCurrentPosition(position);
  }

  function onMouseUp(): void {
    if (isMouseDown) {
      setIsMouseDown(false);
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="Canvas"
      width={window.innerWidth - 50}
      height={window.innerHeight}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    />
  );
}

export default Canvas;
