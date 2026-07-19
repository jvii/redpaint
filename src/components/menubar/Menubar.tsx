import React, { JSX, useLayoutEffect, useRef, useState } from 'react';
import { useActions, useAppState } from '../../overmind';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { CustomBrush } from '../../brush/CustomBrush';
import { brushHistory } from '../../brush/BrushHistory';
import { isBuiltInBrush, Mode } from '../../overmind/brush/state';
import { screenFormats } from '../../overmind/canvas/state';
import { colorToRGBString } from '../../tools/util/util';
import { RetroToggle } from '../ui/RetroToggle';
import { Gadget, GadgetGroup, GadgetOpen, GadgetCluster } from './MenuGadgets';
import { icons, PixelIcon } from './pixelIcons';
import {
  FlipHIcon,
  FlipVIcon,
  Rotate90Icon,
  RotateAnyIcon,
  HalveIcon,
  DoubleIcon,
  StretchIcon,
  ShearIcon,
  BendHIcon,
  BendVIcon,
  RestoreIcon,
} from './transformIcons';
import { BrushTransformToolId } from '../../overmind/toolbox/actions';
import './Menubar.css';

// rail mode-toggle order: two rows of four, reading order matching the old
// Mode column
const MODE_ORDER: Mode[] = ['Matte', 'Color', 'Repl', 'Smear', 'Shade', 'Blend', 'Cycle', 'Smooth'];

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
  const showSaveFilePicker = (window as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;

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
  // the armed modal brush transform's display name (null when none is armed);
  // an active rotate drag appends its live angle readout
  const armedTransform =
    state.toolbox.selectedSelectorToolId === 'brushStretchTool'
      ? 'Stretch'
      : state.toolbox.selectedSelectorToolId === 'brushShearTool'
        ? 'Shear'
        : state.toolbox.selectedSelectorToolId === 'brushRotateTool'
          ? state.tool.brushRotateTool.center
            ? `Rotate ${state.tool.brushRotateTool.angle}°`
            : 'Rotate'
          : state.toolbox.selectedSelectorToolId === 'brushBendHorizontalTool' ||
              state.toolbox.selectedSelectorToolId === 'brushBendVerticalTool'
            ? 'Bend'
            : null;
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

  // gadget click helpers: an instant transform applies and closes the menu;
  // a drag transform arms its modal tool and closes so the drag can start
  const instant = (action: () => void) => (): void => {
    action();
    close();
  };
  const armTransform = (tool: BrushTransformToolId) => (): void => {
    actions.toolbox.toggleBrushTransformMode(tool);
    close();
  };

  // The panel's open height is measured from its content rather than a
  // hand-picked pixel constant — the gadget grid reflows (icon size, wrapped
  // cluster rows, window width) far too often for a magic number to keep up.
  // scrollHeight reports the content's natural height regardless of the
  // explicit height clamp below, so this is safe to read every render.
  const menuMainRef = useRef<HTMLDivElement>(null);
  const [menuContentHeight, setMenuContentHeight] = useState(0);
  useLayoutEffect((): (() => void) | void => {
    const node = menuMainRef.current;
    if (!node) {
      return;
    }
    const measure = (): void => setMenuContentHeight(node.scrollHeight);
    measure();
    // covers reflow the state dependency array can't: wrapping caused purely
    // by a window resize, with no state change to re-trigger this effect
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return (): void => observer.disconnect();
  }, [state.app.brushDrawerOpen, state.brush.mode, armedTransform, usingBuiltInBrush]);

  return (
    <>
      <div className="menubar" onClick={toggle}>
        <div className="menubar__title">
          redpaint
          <div className={`menubar__loading-indicator ${state.app.isLoading ? 'visible' : ''}`}>
            ...
          </div>
        </div>
        {/* while a modal brush transform is armed, a click reshapes the brush
            instead of painting with the mode — so the mode slot says so */}
        <div
          className={
            'menubar__mode-indicator' +
            (armedTransform ? ' menubar__mode-indicator--transform' : '')
          }
        >
          {armedTransform ?? mode}
        </div>
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
        // measured from the content (see menuContentHeight above), not a
        // viewport percentage: overflow is hidden, so a too-small height
        // would clip the gadget grid instead of the panel just growing.
        style={{ height: state.app.menuOpen ? `${menuContentHeight}px` : '0px' }}
        onMouseLeave={close}
        onContextMenu={close}
      >
        <div className="menu__main" ref={menuMainRef}>
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
            {/* image disk I/O, one click from the rail */}
            <GadgetGroup>
              <GadgetOpen
                icon={<PixelIcon map={icons.disk} scale={3} />}
                label="Open"
                title="Open image..."
                handleFile={handleImageFileOpen}
              />
              <Gadget
                icon={<PixelIcon map={icons.disk} scale={3} />}
                label="Save"
                title="Save image..."
                onClick={handleImageSave}
              />
            </GadgetGroup>
            {/* everything brush lives behind this: transforms + brush disk */}
            <GadgetGroup>
              <Gadget
                icon={<PixelIcon map={icons.brush} scale={3} />}
                label="Brush"
                title="Brush tools"
                on={state.app.brushDrawerOpen}
                onClick={actions.app.toggleBrushDrawer}
              />
            </GadgetGroup>
          </div>
          {/* every mode one click away; the pressed segment is the mode
              display. Matte and Repl are custom-brush-only, as before. */}
          <div className="menu__mode-row">
            <div className="wb-cluster__head">Mode</div>
            <RetroToggle
              variant="row"
              value={state.brush.mode}
              onChange={(value): void => actions.brush.setMode(value as Mode)}
              options={MODE_ORDER.map((m) => ({
                value: m,
                label: m,
                disabled: (m === 'Matte' || m === 'Repl') && usingBuiltInBrush,
              }))}
            />
          </div>
          {/* Brush transforms (docs/brush-transforms.md) — custom brushes
              only, like DPaint, grouped as its Size/Flip/Rotate/Bend
              submenus. Double Horiz/Vert exist too but are keyboard-only
              (Shift-X/Y), matching the original. Instant transforms and the
              modal drags close the menu on selection so the reshaped brush
              cursor (or the armed drag) shows at once. */}
          {state.app.brushDrawerOpen && (
            <div className="menu__brush-drawer">
              <div className="wb-cluster__head menu__brush-drawer-head">Brush</div>
              <div className="menu__brush-drawer-row">
                <GadgetCluster head="File">
                  <GadgetOpen
                    icon={<PixelIcon map={icons.disk} scale={3} />}
                    label="Open"
                    title="Open brush..."
                    handleFile={handleBrushFileOpen}
                  />
                  <Gadget
                    icon={<PixelIcon map={icons.disk} scale={3} />}
                    label="Save"
                    title="Save brush..."
                    onClick={handleBrushSave}
                    disabled={!isSaveableBrush(brushHistory.current)}
                  />
                </GadgetCluster>
              </div>
              {/* every transform gets its own row, separate from the file
                  gadgets above — it's a distinct kind of action */}
              <div className="menu__brush-drawer-row">
                <GadgetCluster head="Size">
                  <Gadget
                    icon={<StretchIcon />}
                    label="Stretch"
                    stacked
                    title="Stretch (drag on canvas) — Z"
                    disabled={usingBuiltInBrush}
                    on={state.toolbox.selectedSelectorToolId === 'brushStretchTool'}
                    onClick={armTransform('brushStretchTool')}
                  />
                  <Gadget
                    icon={<HalveIcon />}
                    label="Halve"
                    stacked
                    title="Halve — h"
                    disabled={usingBuiltInBrush}
                    onClick={instant(actions.brush.halveBrush)}
                  />
                  <Gadget
                    icon={<DoubleIcon />}
                    label="Double"
                    stacked
                    title="Double — H"
                    disabled={usingBuiltInBrush}
                    onClick={instant(actions.brush.doubleBrush)}
                  />
                </GadgetCluster>
                <GadgetCluster head="Flip">
                  <Gadget
                    icon={<FlipHIcon />}
                    label="Horizontal"
                    stacked
                    title="Flip horizontally — x"
                    disabled={usingBuiltInBrush}
                    onClick={instant(actions.brush.flipBrushHorizontal)}
                  />
                  <Gadget
                    icon={<FlipVIcon />}
                    label="Vertical"
                    stacked
                    title="Flip vertically — y"
                    disabled={usingBuiltInBrush}
                    onClick={instant(actions.brush.flipBrushVertical)}
                  />
                </GadgetCluster>
                <GadgetCluster head="Rotate">
                  <Gadget
                    icon={<Rotate90Icon />}
                    label="90°"
                    stacked
                    title="Rotate 90 degrees — z"
                    disabled={usingBuiltInBrush}
                    onClick={instant(actions.brush.rotateBrush90)}
                  />
                  <Gadget
                    icon={<RotateAnyIcon />}
                    label="Any Angle"
                    stacked
                    title="Rotate any angle (drag on canvas) — R"
                    disabled={usingBuiltInBrush}
                    on={state.toolbox.selectedSelectorToolId === 'brushRotateTool'}
                    onClick={armTransform('brushRotateTool')}
                  />
                  <Gadget
                    icon={<ShearIcon />}
                    label="Shear"
                    stacked
                    title="Shear (drag on canvas) — S"
                    disabled={usingBuiltInBrush}
                    on={state.toolbox.selectedSelectorToolId === 'brushShearTool'}
                    onClick={armTransform('brushShearTool')}
                  />
                </GadgetCluster>
                <GadgetCluster head="Bend">
                  <Gadget
                    icon={<BendHIcon />}
                    label="Horizontal"
                    stacked
                    title="Bend horizontally (drag on canvas)"
                    disabled={usingBuiltInBrush}
                    on={state.toolbox.selectedSelectorToolId === 'brushBendHorizontalTool'}
                    onClick={armTransform('brushBendHorizontalTool')}
                  />
                  <Gadget
                    icon={<BendVIcon />}
                    label="Vertical"
                    stacked
                    title="Bend vertically (drag on canvas)"
                    disabled={usingBuiltInBrush}
                    on={state.toolbox.selectedSelectorToolId === 'brushBendVerticalTool'}
                    onClick={armTransform('brushBendVerticalTool')}
                  />
                </GadgetCluster>
                {/* enabled when the recall chain has a step to take: on a
                  built-in it re-activates the last custom brush, on a
                  transformed custom brush it undoes the transforms */}
                <GadgetCluster>
                  <Gadget
                    icon={<RestoreIcon />}
                    label="Restore"
                    stacked
                    title="Restore original brush — B"
                    disabled={
                      usingBuiltInBrush
                        ? !state.brush.hasLastCustomBrush
                        : !state.brush.hasOriginalBrush
                    }
                    onClick={instant(actions.brush.restoreOriginalBrush)}
                  />
                </GadgetCluster>
              </div>
            </div>
          )}
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
