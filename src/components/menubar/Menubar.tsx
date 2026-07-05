import React, { JSX, useRef } from 'react';
import { useActions, useAppState } from '../../overmind';
import { MenuItem } from './MenuItem';
import { MenuItemSave } from './MenuItemSave';
import { MenuItemOpen } from './MenuItemOpen';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { BrushColorIndex } from '../../domain/BrushColorIndex';
import { CustomBrush } from '../../brush/CustomBrush';
import { brushHistory } from '../../brush/BrushHistory';
import { builtInBrushes } from '../../overmind/brush/state';
import './Menubar.css';

// Only captured or loaded brushes can be saved — the pixel brush has no
// bitmap and the built-in brushes are not the user's work.
function isSaveableBrush(brush: unknown): boolean {
  return (
    brush instanceof CustomBrush &&
    !Object.values(builtInBrushes).includes(brush)
  );
}

// Saves a canvas as PNG. Asks for the save location first, while the user
// gesture is still fresh (transient activation can expire across async work).
// showSaveFilePicker is Chromium only — other browsers fall back to a regular
// download.
async function saveCanvasAsPng(canvas: HTMLCanvasElement, suggestedName: string): Promise<void> {
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
        suggestedName,
        types: [{ description: 'PNG image', accept: { 'image/png': ['.png'] } }],
      });
    } catch {
      return; // user cancelled the picker
    }
  }

  const blob: Blob | null = await new Promise((resolve): void =>
    canvas.toBlob(resolve, 'image/png')
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
  link.download = suggestedName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout((): void => URL.revokeObjectURL(url), 1000);
}

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
    const file = input.files?.[0];
    if (!file) {
      alert('Failed to open file!');
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = (): void => {
      const decodeCanvas = document.createElement('canvas');
      decodeCanvas.width = image.width;
      decodeCanvas.height = image.height;
      const ctx = decodeCanvas.getContext('2d');
      if (!ctx) {
        return;
      }
      ctx.drawImage(image, 0, 0);
      const brushColorIndex = BrushColorIndex.fromImageData(
        ctx.getImageData(0, 0, image.width, image.height)
      );
      brushHistory.set(new CustomBrush(brushColorIndex, image.width, image.height));
      actions.brush.clearBuiltInBrushSelection();
      actions.brush.setMode('Matte');
      URL.revokeObjectURL(url);
    };
    image.onerror = (): void => {
      URL.revokeObjectURL(url);
      alert('Failed to open file!');
    };
    image.src = url;
  };

  const handleImageSave = (): void => {
    // preserveDrawingBuffer is on, but render once to be sure the buffer is current
    paintingCanvasController.render();
    saveCanvasAsPng(paintingCanvasController.mainCanvas, 'redpaint.png');
  };

  const handleBrushSave = (): void => {
    const brush = brushHistory.current;
    if (!isSaveableBrush(brush) || !(brush instanceof CustomBrush)) {
      return;
    }
    const imageData = brush.toImageData();
    const brushCanvas = document.createElement('canvas');
    brushCanvas.width = imageData.width;
    brushCanvas.height = imageData.height;
    brushCanvas.getContext('2d')?.putImageData(imageData, 0, 0);
    saveCanvasAsPng(brushCanvas, 'brush.png');
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
            <MenuItemSave
              label="Save..."
              onSave={handleBrushSave}
              disabled={!isSaveableBrush(brushHistory.current)}
            ></MenuItemSave>
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
