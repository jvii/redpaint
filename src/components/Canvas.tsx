import React, { useState, useRef } from 'react';
import { Tool, useTool } from '../tools/Tool';
import { Point, PointerState, Color } from '../types';
import './Canvas.css';

interface Props {
  selectedTool: Tool;
  selectedColor: Color;
}

function Canvas({ selectedTool, selectedColor }: Props): JSX.Element {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [previousPosition, setPreviousPosition] = useState<Point | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Point | null>(null);

  const canvasRef = useRef(null);

  const pointerState: PointerState = {
    isMouseDown: isMouseDown,
    previousPosition: previousPosition,
    currentPosition: currentPosition,
  };

  useTool(selectedTool, selectedColor, pointerState, canvasRef.current);

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
