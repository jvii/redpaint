import React, { JSX, useRef } from 'react';
import { useActions, useAppState } from '../../overmind';
import { MenuItem } from './MenuItem';
import { MenuItemSave } from './MenuItemSave';
import { MenuItemOpen } from './MenuItemOpen';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import './Menubar.css';

export function Menubar(): JSX.Element {
  const actions = useActions();
  const state = useAppState();

  const overlayRef = useRef<HTMLDivElement>(document.createElement('div'));

  const toggle = (): void => {
    if (overlayRef.current.clientHeight === 0) {
      overlayRef.current.style.height = '25%';
    } else {
      overlayRef.current.style.height = '0%';
    }
  };

  const close = (): void => {
    overlayRef.current.style.height = '0%';
  };

  const handleImageFileOpen = (input: HTMLInputElement): void => {
    if (input.files?.[0]) {
      actions.canvas.setLoadedImage(URL.createObjectURL(input.files[0]));
    }
  };

  const handleBrushFileOpen = (input: HTMLInputElement): void => {
    if (input.files?.[0]) {
      //actions.brush.setBrush(new CustomBrush(URL.createObjectURL(input.files[0])));
      actions.brush.setMode('Matte');
    } else {
      alert('Failed to open file!');
    }
  };

  const handleImageSave = async (): Promise<void> => {
    // Ask for the save location first, while the user gesture is still fresh
    // (transient activation can expire across async work). Chromium only —
    // other browsers fall back to a regular download.
    type SaveFilePicker = (options?: {
      suggestedName?: string;
      types?: { description: string; accept: Record<string, string[]> }[];
    }) => Promise<{ createWritable: () => Promise<WritableStream> }>;
    const showSaveFilePicker = (window as { showSaveFilePicker?: SaveFilePicker })
      .showSaveFilePicker;

    let fileHandle = null;
    if (showSaveFilePicker) {
      try {
        fileHandle = await showSaveFilePicker({
          suggestedName: 'redpaint.png',
          types: [{ description: 'PNG image', accept: { 'image/png': ['.png'] } }],
        });
      } catch {
        return; // user cancelled the picker
      }
    }

    // preserveDrawingBuffer is on, but render once to be sure the buffer is current
    paintingCanvasController.render();
    const blob: Blob | null = await new Promise((resolve): void =>
      paintingCanvasController.mainCanvas.toBlob(resolve, 'image/png')
    );
    if (!blob) {
      return;
    }

    if (fileHandle) {
      const writable = await fileHandle.createWritable();
      const writer = writable.getWriter();
      await writer.write(blob);
      await writer.close();
      return;
    }

    // fallback: regular browser download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'redpaint.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout((): void => URL.revokeObjectURL(url), 1000);
  };

  const handleBrushSave = (): void => {
    // not implemented yet
  };

  const mode = state.brush.mode;

  return (
    <>
      <div className="menubar" onClick={toggle}>
        <div className="menubar__title">
          redpaint
          <div className={`menubar__loading-indicator ${state.app.isLoading ? 'visible' : ''}`}>
            ...
          </div>
        </div>
        <div className="menubar__mode-indicator">{mode}</div>
      </div>
      <div className="menu" ref={overlayRef} onMouseLeave={close} onContextMenu={close}>
        <div className="menu__content">
          <div className="menu__image">
            <div className="menu__header">Image</div>
            <MenuItemOpen label="Open..." handleFile={handleImageFileOpen}></MenuItemOpen>
            <MenuItemSave label="Save..." onSave={handleImageSave}></MenuItemSave>
          </div>
          <div className="menu__brush">
            <div className="menu__header">Brush</div>
            <MenuItemOpen label="Open..." handleFile={handleBrushFileOpen}></MenuItemOpen>
            <MenuItemSave label="Save..." onSave={handleBrushSave}></MenuItemSave>
          </div>
          <div className="menu__mode">
            <div className="menu__header">Mode</div>
            <MenuItem
              label="Matte"
              isSelected={state.brush.mode === 'Matte'}
              onClick={(): void => actions.brush.setMode('Matte')}
            ></MenuItem>
            <MenuItem
              label="Color"
              isSelected={state.brush.mode === 'Color'}
              onClick={(): void => actions.brush.setMode('Color')}
            ></MenuItem>
          </div>
        </div>
        <div className="closeButtonDiv">
          <button className="menu__closebtn" onClick={close} type="button" aria-label="Close menu">
            &times;
          </button>
        </div>
      </div>
    </>
  );
}
