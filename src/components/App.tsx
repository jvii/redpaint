import React, { JSX } from 'react';
import MainCanvas from './canvas/MainCanvas';
import ZoomCanvas from './canvas/ZoomCanvas';
import { Menubar } from './menubar/Menubar';
import { Toolbox } from './toolbox/Toolbox';
import Palette from './palette/Palette';
import ColorIndicator from './palette/ColorIndicator';
import { BuiltInBrushes } from './toolbox/BuiltInBrushes';
import { GlobalHotKeyManager } from './GlobalHotkeyManager';
import { DialogManager } from './dialog/DialogManager';
import { PaletteEditor } from './paletteEditor/PaletteEditor';
import { SymmetrySettings } from './symmetry/SymmetrySettings';
import './App.css';

function App(): JSX.Element {
  console.log('render App');

  // Add this in your component file

  require('react-dom');
  // @ts-ignore
  window.React2 = require('react');
  // @ts-ignore
  console.log(window.React1! === window.React2!);

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
      <SymmetrySettings></SymmetrySettings>
      <DialogManager></DialogManager>
      <GlobalHotKeyManager />
    </div>
  );
}

export default App;
