import React, { JSX } from 'react';
import MainCanvas from './canvas/MainCanvas';
import ZoomCanvas from './canvas/ZoomCanvas';
import { Menubar } from './menu/Menubar';
import { Menu } from './menu/Menu';
import { Toolbox } from './toolbox/Toolbox';
import Palette from './palette/Palette';
import ColorIndicator from './palette/ColorIndicator';
import { BuiltInBrushes } from './toolbox/BuiltInBrushes';
import { GlobalHotKeyManager } from './GlobalHotkeyManager';
import { DialogManager } from './dialog/DialogManager';
import { PaletteEditor } from './paletteEditor/PaletteEditor';
import { ScreenFormatDialog } from './screenFormat/ScreenFormatDialog';
import { ImageLoadDialog } from './imageLoad/ImageLoadDialog';
import { BrushLoadDialog } from './imageLoad/BrushLoadDialog';
import { SymmetrySettings } from './symmetry/SymmetrySettings';
import { FillStyleSettings } from './fillStyle/FillStyleSettings';
import './App.css';

function App(): JSX.Element {
  return (
    <div className="app">
      <Menubar />
      <Menu />
      <div className="canvas-toolbox-container">
        <div className="canvas-container">
          <MainCanvas />
          <ZoomCanvas />
        </div>
        <div className="toolbox-container">
          <BuiltInBrushes />
          <Toolbox />
          <ColorIndicator />
          <Palette fillHeight />
        </div>
      </div>
      <PaletteEditor></PaletteEditor>
      <ScreenFormatDialog></ScreenFormatDialog>
      <ImageLoadDialog></ImageLoadDialog>
      <BrushLoadDialog></BrushLoadDialog>
      <SymmetrySettings></SymmetrySettings>
      <FillStyleSettings></FillStyleSettings>
      <DialogManager></DialogManager>
      <GlobalHotKeyManager />
    </div>
  );
}

export default App;
