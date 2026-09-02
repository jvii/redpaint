import React, { JSX, useEffect, useRef } from 'react';
import { useActions, useAppState } from '../../overmind';
import { colorToRGBString } from '../../algorithm/color';
import { refreshBrushPreview } from '../GlobalHotkeyManager';
import { ColorFillBox } from './ColorFillBox';
import { registerCoordsNodes } from './coordsDisplay';
import { AxisArrow } from './transformIcons';
import './Menubar.css';

// The flood fill bucket glyph, lifted from the toolbox sprite's
// "floodfill-active" symbol (src/resources/toolbar.svg) minus its outer square
// outline: just the tilted bucket + pour lines, sized up a bit for the menubar.
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

// The 50px bar itself: title, mode/transform indicator, then the status
// cluster (Color Fill Box, flood fill swatch).
// Clicking anywhere on it toggles the drop-down Menu panel (Menu.tsx).
export function Menubar(): JSX.Element {
  const actions = useActions();
  const state = useAppState();

  const mode = state.brush.mode;
  const flash = state.app.flash;
  // The armed modal state, as a name plus an optional live readout: the name is
  // the mode, the readout is the thing the mode is deciding, a crop's size, a
  // rotate's angle. Split rather than one string so the two can take different
  // weights (see Menubar.css): the name is the loud part, the number is a
  // value, and this app writes values in blue.
  const selectorId = state.toolbox.selectedSelectorToolId;
  const resizeSize = state.tool.sizeBuiltInBrushTool.size;
  const sizeReadout = resizeSize ? `${resizeSize.width}\u00d7${resizeSize.height}` : undefined;
  const armedTransform: { name: string; value?: string } | null =
    selectorId === 'brushStretchTool'
      ? { name: 'Stretch' }
      : selectorId === 'sizeBuiltInBrushTool'
        ? { name: 'Resize', value: sizeReadout }
        : selectorId === 'brushShearTool'
          ? { name: 'Shear' }
          : selectorId === 'brushRotateTool'
            ? {
                // shown from the moment the mode is armed, reading 0° until a
                // drag moves it, same as a crop showing its size before you
                // touch the box. brushRotateStart resets the angle whenever a
                // drag ends, so this is never a stale figure from last time.
                name: 'Rotate',
                value: `${state.tool.brushRotateTool.angle}\u00b0`,
              }
            : selectorId === 'brushBendHorizontalTool' || selectorId === 'brushBendVerticalTool'
              ? { name: 'Bend' }
              : null;
  // A crop carries its live size the way an active rotate carries its angle.
  // The multiplication sign, not a lowercase x. It centres on the digits'
  // baseline where the x sits 2px low (see ScreenStatus's Dimensions).
  const cropRect = state.crop.rect;
  const armedMode: { name: string; value?: string } | null = cropRect
    ? { name: 'Crop', value: `${cropRect.width}\u00d7${cropRect.height}` }
    : armedTransform;
  // What an armed mode lets you do, beside the mode's own name. Keycaps are for
  // keyboard keys only (a mouse gesture written as a cap would be pretending a
  // button is a key), so those stay plain text. Kept to two chips: this shares
  // a row with the title and the indicators, and a hint that crowds them is
  // worse than a hint that says less.
  const armedHint: { key?: string; text: string }[] | null = cropRect
    ? [{ text: 'right-click to apply' }, { key: 'ESC', text: 'cancel' }]
    : armedTransform
      ? [{ text: 'drag on canvas' }, { key: 'ESC', text: 'cancel' }]
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

  return (
    <div
      className="menubar"
      onClick={(): void => actions.app.toggleMenu()}
      onContextMenu={(event): void => {
        event.preventDefault(); // right-click toggles the menu, not the browser's own menu
        actions.app.toggleMenu();
        // Closing uncovers the canvas under the pointer, but the overlay cursor
        // only repaints on mousemove: replay one so it's visible immediately
        // instead of only after the mouse next moves.
        setTimeout(refreshBrushPreview, 0);
      }}
    >
      <div className="menubar__title">
        redpaint
        <div className={`menubar__loading-indicator ${state.app.isLoading ? 'visible' : ''}`}>
          ...
        </div>
      </div>
      {/* While a modal state is armed, a click does that rather than paint, so
          the slot says so. A flash outranks it, briefly — but never in the
          armed orange, which means "armed" and not "done". */}
      <div
        className={
          'menubar__mode-indicator' +
          (flash ? ' menubar__mode-indicator--flash' : '') +
          (armedMode && !flash ? ' menubar__mode-indicator--armed' : '')
        }
        key={flash ? `flash-${flash.id}` : 'mode'}
      >
        <span className="menubar__mode-name">
          {flash?.name ?? armedMode?.name ?? mode}
          {(flash ?? armedMode)?.value && (
            <span className="menubar__mode-value">{(flash ?? armedMode)?.value}</span>
          )}
        </span>
        {armedHint && (
          <span className="supporting-text menubar__hint">
            {armedHint.map((hint) => (
              <span className="menubar__hint-item" key={hint.text}>
                {hint.key && <kbd className="wb-gadget__keycap menubar__hint-key">{hint.key}</kbd>}
                {hint.text}
              </span>
            ))}
          </span>
        )}
      </div>
      {/* Both indicators are transient, so they share one left-aligned
          cluster: the Color Fill Box comes first (DPaint put it directly
          right of the mode text) and the flood fill swatch, which blinks in
          and out with the cursor, sits after it where it can't shove the
          Color Fill Box sideways as it appears. */}
      <div className="menubar__indicators">
        {state.fillStyle.effectiveMode !== 'solid' && <ColorFillBox />}
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
      {state.app.showCoordinates && <CoordsReadout />}
    </div>
  );
}

// Two nodes so the updater writes two short strings rather than rebuilding the
// row. Registered on mount and cleared on unmount, which is what turning the
// setting off does.
function CoordsReadout(): JSX.Element {
  const xRef = useRef<HTMLSpanElement>(null);
  const yRef = useRef<HTMLSpanElement>(null);
  useEffect((): (() => void) => {
    registerCoordsNodes(xRef.current, yRef.current);
    return (): void => registerCoordsNodes(null, null);
  }, []);
  return (
    <div className="menubar__coords">
      <span className="menubar__coord">
        <span className="menubar__coord-value" ref={xRef}></span>
        <AxisArrow axis="x" />
      </span>
      <span className="menubar__coord">
        <span className="menubar__coord-value" ref={yRef}></span>
        <AxisArrow axis="y" />
      </span>
    </div>
  );
}
