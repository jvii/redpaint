import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { screenFormats } from '../../overmind/canvas/state';
import './ScreenStatus.css';

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

// The live screen state readout plus the view-scaling toggle beside it. Each
// segment is the way into the requester that changes it. Resolution and colors
// share a segment because one requester owns both.
export function ScreenStatus(): JSX.Element {
  const actions = useActions();
  const state = useAppState();

  // null while no screen is simulated (Native): the canvas is shown 1:1
  const screenFormat = state.canvas.screenFormatId
    ? screenFormats[state.canvas.screenFormatId]
    : null;
  const openScreenFormat = (): void => {
    actions.dialog.open('SCREEN_FORMAT');
    actions.app.closeMenu();
  };

  // The canvas has no requester of its own yet; the screen format one is where
  // it gets resized today (its fit / crop / keep question). Point this at a
  // dedicated Canvas Size requester once that exists.
  const openCanvasSize = openScreenFormat;

  return (
    <>
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
    </>
  );
}
