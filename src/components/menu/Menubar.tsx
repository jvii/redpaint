import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { colorToRGBString } from '../../algorithm/color';
import { refreshBrushPreview } from '../GlobalHotkeyManager';
import { ColorFillBox } from './ColorFillBox';
import './Menubar.css';

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

// The 50px bar itself: title, mode/transform indicator, then the status
// cluster (Color Fill Box, flood fill swatch).
// Clicking anywhere on it toggles the drop-down Menu panel (Menu.tsx).
export function Menubar(): JSX.Element {
  const actions = useActions();
  const state = useAppState();

  const mode = state.brush.mode;
  // the armed modal brush transform's display name (null when none is armed);
  // an active rotate drag appends its live angle readout
  const armedTransform =
    state.toolbox.selectedSelectorToolId === 'brushStretchTool'
      ? 'Stretch'
      : state.toolbox.selectedSelectorToolId === 'sizeBuiltInBrushTool'
        ? 'Resize'
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
  // Any armed modal state takes the mode slot, not just the brush transforms:
  // while one is up, a click does that thing instead of painting with the
  // mode, which is the whole reason the slot says so. Crop wins over a
  // transform because its overlay covers the canvas outright.
  // A crop carries its live size the way an active rotate carries its angle:
  // the box's own dimensions are the thing you are deciding, and the menubar
  // is where this app already puts a mode's live readout. The multiplication
  // sign, not a lowercase x — it centres on the digits' baseline where the x
  // sits 2px low (see ScreenStatus's Dimensions).
  const cropRect = state.crop.rect;
  const armedMode = cropRect ? `Crop ${cropRect.width}\u00d7${cropRect.height}` : armedTransform;
  // What an armed mode lets you do, beside the mode's own name. Keycaps are
  // for keyboard keys only — a mouse gesture written as a cap would be
  // pretending a button is a key — so those stay plain text. Kept to two
  // chips: this shares a row with the title and the indicators, and a hint
  // that crowds them is worse than a hint that says less.
  const armedHint: { key?: string; text: string }[] | null = state.crop.rect
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
        // Closing uncovers the canvas under the pointer, but the overlay
        // cursor only repaints on mousemove — replay one so it's visible
        // immediately instead of only after the mouse next moves.
        setTimeout(refreshBrushPreview, 0);
      }}
    >
      <div className="menubar__title">
        redpaint
        <div className={`menubar__loading-indicator ${state.app.isLoading ? 'visible' : ''}`}>
          ...
        </div>
      </div>
      {/* while a modal state is armed — a brush transform, a crop — a click
          does that instead of painting with the mode, so the slot says so */}
      <div
        className={'menubar__mode-indicator' + (armedMode ? ' menubar__mode-indicator--armed' : '')}
      >
        {armedMode ?? mode}
        {armedHint && (
          <span className="menubar__hint">
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
    </div>
  );
}
