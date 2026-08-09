import React, { JSX, useLayoutEffect } from 'react';
import { useAppState } from '../overmind';
import { applyUiScale } from '../uiScale';
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
import { CanvasSizeDialog } from './canvasSize/CanvasSizeDialog';
import { SaveAsDialog } from './saveAs/SaveAsDialog';
import { useDocumentTitle } from './useDocumentTitle';
import { useDocumentAutosave } from './useDocumentAutosave';
import { BrushLoadDialog } from './imageLoad/BrushLoadDialog';
import { SymmetrySettings } from './symmetry/SymmetrySettings';
import { FillStyleSettings } from './fillStyle/FillStyleSettings';
import './App.css';

function App(): JSX.Element {
  // Mirrors the chrome scale onto :root as --ui-scale, which is where every
  // zoomed container reads it from (uiScale.ts). A layout effect, not a plain
  // one, so the restored setting is in place before the first paint rather
  // than a frame of full-size chrome later.
  const state = useAppState();
  const uiScale = state.app.uiScale;
  useDocumentTitle();
  useDocumentAutosave();
  useLayoutEffect((): void => applyUiScale(uiScale), [uiScale]);

  return (
    <div
      className={'app' + (state.crop.rect ? ' app--cropping' : '')}
      // While a crop is armed the chrome takes no pointer events (App.css), so
      // the menubar's own handler — the one that normally suppresses the
      // browser menu there — never runs, and a right-click anywhere off the
      // canvas raises the OS menu instead. Right-click is the crop's commit
      // gesture, so that is exactly the button someone will be pressing.
      // Suppressed at the root, which is the whole viewport; the overlay's own
      // handler has already run and committed by the time this bubbles.
      onContextMenu={state.crop.rect ? (event): void => event.preventDefault() : undefined}
    >
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
      <CanvasSizeDialog></CanvasSizeDialog>
      <SaveAsDialog></SaveAsDialog>
      <BrushLoadDialog></BrushLoadDialog>
      <SymmetrySettings></SymmetrySettings>
      <FillStyleSettings></FillStyleSettings>
      <DialogManager></DialogManager>
      <GlobalHotKeyManager />
    </div>
  );
}

export default App;
