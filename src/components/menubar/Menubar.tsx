import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { MenuItem } from './MenuItem';
import { MenuItemSave } from './MenuItemSave';
import { MenuItemOpen } from './MenuItemOpen';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { CustomBrush } from '../../brush/CustomBrush';
import { brushHistory } from '../../brush/BrushHistory';
import { isBuiltInBrush } from '../../overmind/brush/state';
import { screenFormats } from '../../overmind/canvas/state';
import { colorToRGBString } from '../../tools/util/util';
import './Menubar.css';

// Only captured or loaded brushes can be saved — the pixel brush has no
// bitmap and the built-in brushes are not the user's work.
function isSaveableBrush(brush: unknown): boolean {
  return brush instanceof CustomBrush && !isBuiltInBrush(brush);
}

// Four arrows radiating to the corners: the standard "expand to fill" glyph.
// (Axis-aligned outward arrows crossing at the centre are the *move* cursor.)
// Each arrow is an open barb — two strokes meeting at the tip — and a diagonal
// shaft stepping corner to corner, as a 45-degree line does in pixel art.
//
// A 12-unit grid drawn at 48px puts one drawn pixel on 4 css pixels, which is
// exactly what Press Start 2P renders at the close gadget's 32px (its glyphs sit
// on an 8px grid), so the icon and the X are built from the same size of pixel.
// The font carries no arrow glyphs, so a text arrow would fall back to a system
// one. fill inherits currentColor, following the gadget's hover/active colors.
const stretchIcon = (
  <svg className="view-scaling__icon" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
    {/* top-left */}
    <rect x="1" y="1" width="3" height="1" />
    <rect x="1" y="1" width="1" height="3" />
    <rect x="2" y="2" width="1" height="1" />
    <rect x="3" y="3" width="1" height="1" />
    <rect x="4" y="4" width="1" height="1" />
    {/* top-right */}
    <rect x="8" y="1" width="3" height="1" />
    <rect x="10" y="1" width="1" height="3" />
    <rect x="9" y="2" width="1" height="1" />
    <rect x="8" y="3" width="1" height="1" />
    <rect x="7" y="4" width="1" height="1" />
    {/* bottom-left */}
    <rect x="1" y="10" width="3" height="1" />
    <rect x="1" y="8" width="1" height="3" />
    <rect x="2" y="9" width="1" height="1" />
    <rect x="3" y="8" width="1" height="1" />
    <rect x="4" y="7" width="1" height="1" />
    {/* bottom-right */}
    <rect x="8" y="10" width="3" height="1" />
    <rect x="10" y="8" width="1" height="3" />
    <rect x="9" y="9" width="1" height="1" />
    <rect x="8" y="8" width="1" height="1" />
    <rect x="7" y="7" width="1" height="1" />
  </svg>
);

// The flood fill bucket glyph, lifted from the toolbox sprite's
// "floodfill-active" symbol (src/resources/toolbar.svg) minus its outer
// square outline — just the tilted bucket + pour lines, sized up a bit for
// the menubar.
const floodFillIcon = (
  <svg
    className="menubar__floodfill-icon"
    viewBox="0 0 26.458 26.458"
    aria-hidden="true"
    focusable="false"
  >
    <g transform="translate(-3.635 -3.4126)" stroke="black" fill="none">
      <rect
        transform="rotate(45)"
        x="16.248"
        y="-7.1208"
        width="11.319"
        height="11.319"
        strokeWidth="1.6139"
      />
      <path d="m15.555 21.495v6.3424" strokeWidth="1.3833" />
      <path d="m11.217 27.49h8.6364" strokeWidth="1.3795" />
    </g>
  </svg>
);

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

  const toggle = (): void => {
    actions.app.toggleMenu();
  };

  const close = (): void => {
    actions.app.closeMenu();
  };

  const handleImageFileOpen = (input: HTMLInputElement): void => {
    if (input.files?.[0]) {
      // decodes, then opens the load requester (color treatment)
      actions.app.beginImageLoad(URL.createObjectURL(input.files[0]));
    }
  };

  const handleBrushFileOpen = (input: HTMLInputElement): void => {
    if (input.files?.[0]) {
      // decodes, then opens the load requester (color treatment)
      actions.app.beginBrushLoad(URL.createObjectURL(input.files[0]));
    }
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
  // Flood Fill targets whatever pixel is under the cursor rather than a
  // fixed FG/BG color, so a hover swatch previews what the fill would hit.
  const floodFillHoverColor = state.tool.floodFillTool.hoverColor;
  const floodFillHoverSwatchColor =
    state.toolbox.activeToolId === 'floodFill' && floodFillHoverColor
      ? floodFillHoverColor.kind === 'rgb'
        ? floodFillHoverColor.color
        : state.palette.palette[floodFillHoverColor.colorNumber]
      : null;
  // for disabling Matte mode selection when using a built-in brush
  const usingBuiltInBrush = state.brush.selectedBuiltInBrushId !== null;
  // null while no screen is simulated (Native): the canvas is shown 1:1
  const screenFormat = state.canvas.screenFormatId
    ? screenFormats[state.canvas.screenFormatId]
    : null;
  const openScreenFormat = (): void => {
    actions.dialog.open('SCREEN_FORMAT');
    close();
  };

  // The canvas has no requester of its own yet; the screen format one is where
  // it gets resized today (its fit / crop / keep question). Point this at a
  // dedicated Canvas Size requester once that exists.
  const openCanvasSize = openScreenFormat;

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
        {floodFillHoverSwatchColor && (
          <div className="menubar__floodfill-indicator">
            {floodFillIcon}
            <div
              className="menubar__floodfill-swatch"
              style={{ backgroundColor: colorToRGBString(floodFillHoverSwatchColor) }}
              title="Flood fill target color"
            ></div>
          </div>
        )}
      </div>
      <div
        className="menu"
        // fixed height, not a viewport percentage: the status strip made the
        // content tall enough that a short window would clip it (overflow is
        // hidden). The markup's height is constant, so a constant fits it.
        // 420px clears the Mode column's 8 entries (Matte..Smooth) with a
        // little headroom; content measures ~411px tall.
        style={{ height: state.app.menuOpen ? '420px' : '0px' }}
        onMouseLeave={close}
        onContextMenu={close}
      >
        <div className="menu__main">
          {/* Live screen state. Each segment is the way into the requester that
              changes it. Resolution and colors share a segment because one
              requester owns both. */}
          <div className="menu__status">
            <div className="screen-status">
              <button
                className="screen-status__segment"
                type="button"
                onClick={openScreenFormat}
                title="Change screen format"
              >
                <span className="screen-status__field">
                  <span className="screen-status__label">Resolution</span>
                  {screenFormat ? (
                    <>
                      {screenFormat.name} <b>{`${screenFormat.width}x${screenFormat.height}`}</b>
                    </>
                  ) : (
                    'Native'
                  )}
                </span>
                <span className="screen-status__field screen-status__field--colors">
                  <span className="screen-status__label">Palette</span>
                  <b>{state.palette.paletteArray.length}</b>
                </span>
                {/* the mode (the requester's switch), not whether true-color
                    pixels exist yet — so flipping the switch shows here at
                    once, before anything is painted */}
                <span className="screen-status__field">
                  <span className="screen-status__label">True Color</span>
                  {state.canvas.trueColorEnabled ? (
                    <b className="screen-status__rainbow">ON</b>
                  ) : (
                    <b className="screen-status__truecolor-off">OFF</b>
                  )}
                </span>
              </button>
              <button
                className="screen-status__segment"
                type="button"
                onClick={openCanvasSize}
                title="Change canvas size"
              >
                <span className="screen-status__field">
                  <span className="screen-status__label">Canvas</span>
                  <b>{`${state.canvas.resolution.width}x${state.canvas.resolution.height}`}</b>
                </span>
              </button>
            </div>
            {/* How the simulated screen fills the window. Named for what
                switching it on does, so the resting state needs no label: on,
                the screen stretches to fill the window; off, it is pixel perfect
                — every pixel the same whole block, leaving a margin. Independent
                of the format, and meaningless at Native, always 1:1. */}
            {screenFormat && (
              <button
                className={
                  'view-scaling' + (state.canvas.scaleMode === 'stretch' ? ' view-scaling--on' : '')
                }
                type="button"
                aria-pressed={state.canvas.scaleMode === 'stretch'}
                aria-label="Stretch"
                onClick={actions.canvas.toggleScaleMode}
                title="Stretch the screen to fill the window. Turn off for pixel-perfect scaling: every pixel the same whole block, leaving a margin."
              >
                {stretchIcon}
              </button>
            )}
          </div>
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
                disabled={usingBuiltInBrush}
                onClick={(): void => actions.brush.setMode('Matte')}
              ></MenuItem>
              <MenuItem
                label="Color"
                isSelected={state.brush.mode === 'Color'}
                onClick={(): void => actions.brush.setMode('Color')}
              ></MenuItem>
              <MenuItem
                label="Repl"
                isSelected={state.brush.mode === 'Repl'}
                disabled={usingBuiltInBrush}
                onClick={(): void => actions.brush.setMode('Repl')}
              ></MenuItem>
              <MenuItem
                label="Smear"
                isSelected={state.brush.mode === 'Smear'}
                onClick={(): void => actions.brush.setMode('Smear')}
              ></MenuItem>
              <MenuItem
                label="Shade"
                isSelected={state.brush.mode === 'Shade'}
                onClick={(): void => actions.brush.setMode('Shade')}
              ></MenuItem>
              <MenuItem
                label="Blend"
                isSelected={state.brush.mode === 'Blend'}
                onClick={(): void => actions.brush.setMode('Blend')}
              ></MenuItem>
              <MenuItem
                label="Cycle"
                isSelected={state.brush.mode === 'Cycle'}
                onClick={(): void => actions.brush.setMode('Cycle')}
              ></MenuItem>
              <MenuItem
                label="Smooth"
                isSelected={state.brush.mode === 'Smooth'}
                onClick={(): void => actions.brush.setMode('Smooth')}
              ></MenuItem>
            </div>
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
