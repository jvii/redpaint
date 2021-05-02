import React from 'react';
import MainCanvas from './canvas/MainCanvas';
import ZoomCanvas from './canvas/ZoomCanvas';
import { Menubar } from './menubar/Menubar';
import { Toolbox } from './toolbox/Toolbox';
import Palette from './palette/Palette';
import ColorIndicator from './palette/ColorIndicator';
import { BuiltInBrushes } from './toolbox/BuiltInBrushes';
import { GlobalHotKeyManager } from './GlobalHotkeyManager';
import { DialogManager } from './dialog/DialogManager';
import './App.css';
import { PaletteEditor } from './paletteEditor/PaletteEditor';

function App(): JSX.Element {
  console.log('render App');

  return (
    <div className="app">
      <Menubar />
      <div className="canvas-toolbox-container">
        <div className="canvas-container">
          <MainCanvas />
          <ZoomCanvas />
        </div>
        <div className="toolbox-container">
          <BuiltInBrushes />
          <Toolbox />
          <ColorIndicator />
          <Palette />
        </div>
      </div>
      <PaletteEditor></PaletteEditor>
      <DialogManager></DialogManager>
      <GlobalHotKeyManager />
    </div>
  );
}

export default App;
