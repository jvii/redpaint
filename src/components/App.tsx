import React, { useReducer } from 'react';
import MainCanvas from './canvas/MainCanvas';
import ZoomCanvas from './canvas/ZoomCanvas';
import { Menubar } from './menubar/Menubar';
import { Toolbox } from './toolbox/Toolbox';
import Palette from './palette/Palette';
import ColorIndicator from './palette/ColorIndicator';
import { CanvasState, canvasStateReducer } from './canvas/CanvasState';
import { CanvasSyncHandler } from './canvas/CanvasSyncHandler';
import { BuiltInBrushes } from './toolbox/BuiltInBrushes';
import './App.css';

const initialCanvasState = new CanvasState();

function App(): JSX.Element {
  console.log('render App');
  const [canvasState, canvasDispatch] = useReducer(canvasStateReducer, initialCanvasState);

  return (
    <div className="app">
      <Menubar />
      <div className="canvas-area">
        <MainCanvas canvasDispatch={canvasDispatch} canvasState={canvasState} />
        <ZoomCanvas canvasDispatch={canvasDispatch} />
        <CanvasSyncHandler canvasState={canvasState} />
      </div>
      <BuiltInBrushes />
      <Toolbox canvasState={canvasState} />
      <ColorIndicator />
      <Palette />
    </div>
  );
}

export default App;
