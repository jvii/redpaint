import React, { useState, useRef } from 'react';
import { useTool } from './hooks';

function Canvas() {

  type Point = {x:number, y:number}

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [previousPosition, setPreviousPosition] = useState<Point | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Point | null>(null);

  const canvasRef = useRef(null);

  useTool(isMouseDown, previousPosition, currentPosition, canvasRef.current!);

  function onMouseDown(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    setIsMouseDown(true);
  }

  function onMouseMove(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    const position : Point = {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY
    }
    setPreviousPosition(currentPosition);
    setCurrentPosition(position)
  }

  function onMouseUp() {
    if (isMouseDown) {
      setIsMouseDown(false);
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={1000}
      height={window.innerHeight}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    />
  )
}

export default Canvas;
