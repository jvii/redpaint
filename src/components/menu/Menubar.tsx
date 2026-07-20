import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { colorToRGBString } from '../../tools/util/util';
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

// The 50px bar itself: title, mode/transform indicator, flood fill swatch.
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

  return (
    <div className="menubar" onClick={(): void => actions.app.toggleMenu()}>
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
          'menubar__mode-indicator' + (armedTransform ? ' menubar__mode-indicator--transform' : '')
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
  );
}
