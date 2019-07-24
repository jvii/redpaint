import React, { useReducer } from 'react';
import MainCanvas from './canvas/MainCanvas';
import ZoomCanvas from './canvas/ZoomCanvas';
import Toolbar from './toolbar/Toolbar';
import Palette from './palette/Palette';
import ColorIndicator from './palette/ColorIndicator';
import { PaletteState, paletteStateReducer } from './palette/PaletteState';
import { CanvasState, canvasStateReducer } from './canvas/CanvasState';
import { ToolbarState, toolbarStateReducer } from './toolbar/ToolbarState';
import './App.css';

const initialToolbarState = new ToolbarState();
const initialPaletteState = new PaletteState();
const initialCanvasState = new CanvasState();

function App(): JSX.Element {
  const [toolbarState, toolbarDispatch] = useReducer(toolbarStateReducer, initialToolbarState);
  const [paletteState, paletteDispatch] = useReducer(paletteStateReducer, initialPaletteState);
  const [canvasState, canvasDispatch] = useReducer(canvasStateReducer, initialCanvasState);

  return (
    <div className="App">
      <div className="CanvasArea">
        <MainCanvas
          canvasDispatch={canvasDispatch}
          canvasState={canvasState}
          toolbarState={toolbarState}
          paletteState={paletteState}
        />
        <ZoomCanvas
          canvasDispatch={canvasDispatch}
          canvasState={canvasState}
          toolbarState={toolbarState}
          paletteState={paletteState}
        />
      </div>
      <Toolbar
        toolbarDispatch={toolbarDispatch}
        toolbarState={toolbarState}
        canvasState={canvasState}
        paletteState={paletteState}
      />
      <ColorIndicator paletteState={paletteState} />
      <Palette paletteDispatch={paletteDispatch} paletteState={paletteState} />
    </div>
  );
}

export default App;
