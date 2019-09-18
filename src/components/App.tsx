import React, { useReducer } from 'react';
import MainCanvas from './canvas/MainCanvas';
import ZoomCanvas from './canvas/ZoomCanvas';
import Toolbar from './toolbar/Toolbar';
import Palette from './palette/Palette';
import ColorIndicator from './palette/ColorIndicator';
import { PaletteState, paletteStateReducer } from './palette/PaletteState';
import { CanvasState, canvasStateReducer } from './canvas/CanvasState';
import './App.css';
import { CanvasSyncHandler } from './canvas/CanvasSyncHandler';

const initialPaletteState = new PaletteState();
const initialCanvasState = new CanvasState();

function App(): JSX.Element {
  console.log('render App');
  const [paletteState, paletteDispatch] = useReducer(paletteStateReducer, initialPaletteState);
  const [canvasState, canvasDispatch] = useReducer(canvasStateReducer, initialCanvasState);

  return (
    <div className="App">
      <div className="CanvasArea">
        <MainCanvas
          canvasDispatch={canvasDispatch}
          canvasState={canvasState}
          paletteState={paletteState}
        />
        <ZoomCanvas
          canvasDispatch={canvasDispatch}
          canvasState={canvasState}
          paletteState={paletteState}
        />
        <CanvasSyncHandler canvasState={canvasState} />
      </div>
      <Toolbar canvasState={canvasState} paletteState={paletteState} />
      <ColorIndicator paletteState={paletteState} />
      <Palette paletteDispatch={paletteDispatch} paletteState={paletteState} />
    </div>
  );
}

export default App;
