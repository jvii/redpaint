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
import { StencilSettings } from './stencil/StencilSettings';
import { ScreenFormatDialog } from './screenFormat/ScreenFormatDialog';
import { ImageLoadDialog } from './imageLoad/ImageLoadDialog';
import { CanvasSizeDialog } from './canvasSize/CanvasSizeDialog';
import { SaveAsDialog } from './saveAs/SaveAsDialog';
import { useDocumentTitle } from './useDocumentTitle';
import { useDocumentAutosave } from './useDocumentAutosave';
import { BrushLoadDialog } from './imageLoad/BrushLoadDialog';
import { SymmetrySettings } from './symmetry/SymmetrySettings';
import { FillStyleSettings } from './fillStyle/FillStyleSettings';
import { FontRequester } from './font/FontRequester';
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

  // The chrome takes no pointer events in either of these (App.css), so its own
  // handlers - the ones that normally suppress the browser's menu there - never
  // run, and a right-click off the canvas raises the OS menu instead.
  const canvasPicking = state.stencil.requesterOpen || state.paletteEditor.isOpen;
  const inertChrome = !!state.crop.rect || canvasPicking;

  return (
    <div
      className={
        'app' +
        (state.crop.rect ? ' app--cropping' : '') +
        (canvasPicking ? ' app--canvas-picking' : '')
      }
      // Suppressed at the root, which is the whole viewport. Nothing below loses
      // its own right click: every handler that wants one has run by the time
      // this bubbles - an armed crop commits on it, and the picking requesters
      // take it on the canvas.
      onContextMenu={inertChrome ? (event): void => event.preventDefault() : undefined}
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
      <StencilSettings />
      <ScreenFormatDialog></ScreenFormatDialog>
      <ImageLoadDialog></ImageLoadDialog>
      <CanvasSizeDialog></CanvasSizeDialog>
      <SaveAsDialog></SaveAsDialog>
      <BrushLoadDialog></BrushLoadDialog>
      <SymmetrySettings></SymmetrySettings>
      <FillStyleSettings></FillStyleSettings>
      <FontRequester></FontRequester>
      <DialogManager></DialogManager>
      <GlobalHotKeyManager />
    </div>
  );
}

export default App;
