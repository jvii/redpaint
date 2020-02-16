import React, { useReducer } from 'react';
import MainCanvas from './canvas/MainCanvas';
import ZoomCanvas from './canvas/ZoomCanvas';
import { Toolbox } from './toolbox/Toolbox';
import Palette from './palette/Palette';
import ColorIndicator from './palette/ColorIndicator';
import { CanvasState, canvasStateReducer } from './canvas/CanvasState';
import './App.css';
import { CanvasSyncHandler } from './canvas/CanvasSyncHandler';

const initialCanvasState = new CanvasState();

function App(): JSX.Element {
  console.log('render App');
  const [canvasState, canvasDispatch] = useReducer(canvasStateReducer, initialCanvasState);

  return (
    <div className="App">
      <div className="CanvasArea">
        <MainCanvas canvasDispatch={canvasDispatch} canvasState={canvasState} />
        <ZoomCanvas canvasDispatch={canvasDispatch} />
        <CanvasSyncHandler canvasState={canvasState} />
      </div>
      <Toolbox canvasState={canvasState} />
      <ColorIndicator />
      <Palette />
    </div>
  );
}

export default App;
