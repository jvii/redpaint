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
import { GlobalHotKeyManager } from './GlobalHotkeyManager';
import { DialogManager } from './dialog/DialogManager';
import './App.css';
import { PaletteEditor } from './paletteEditor/PaletteEditor';

const initialCanvasState = new CanvasState();

function App(): JSX.Element {
  console.log('render App');
  const [canvasState, canvasDispatch] = useReducer(canvasStateReducer, initialCanvasState);

  return (
    <div className="app">
      <Menubar />
      <div className="canvas-toolbox-container">
        <div className="canvas-container">
          <MainCanvas canvasDispatch={canvasDispatch} canvasState={canvasState} />
          <ZoomCanvas canvasDispatch={canvasDispatch} />
          <CanvasSyncHandler canvasState={canvasState} />
        </div>
        <div className="toolbox-container">
          <BuiltInBrushes />
          <Toolbox canvasState={canvasState} />
          <ColorIndicator />
          <Palette />
        </div>
      </div>
      <PaletteEditor canvasState={canvasState}></PaletteEditor>
      <DialogManager></DialogManager>
      <GlobalHotKeyManager />
    </div>
  );
}

export default App;
