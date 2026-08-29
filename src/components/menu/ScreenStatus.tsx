import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { resolveScreenFormat } from '../../overmind/canvas/state';
import './ScreenStatus.css';

// A width-by-height readout. The separator is U+00D7, not the letter x, and it
// sits outside the <b> so it takes the segment's own colour - black at rest,
// white on hover - instead of the value blue, which is what keeps it reading
// as a mark between two numbers rather than a third character of one.
//
// Press Start 2P has a real multiplication sign, so this stays a font glyph on
// the same pixel grid as everything else (no drawn icon needed): at 16px its
// ink is 10px tall to the digits' 14px, and both centre on baseline-9, so it
// is exactly centred. The lowercase x it replaces centres on baseline-7 - the
// 2px drop that made it sit low against the numbers.
function Dimensions({ width, height }: { width: number; height: number }): JSX.Element {
  return (
    <>
      <b>{width}</b>×<b>{height}</b>
    </>
  );
}

// Four arrows radiating to the corners: the standard "expand to fill" glyph.
// (Axis-aligned outward arrows crossing at the centre are the *move* cursor.)
// Each arrow is an open barb (two strokes meeting at the tip), and a diagonal
// shaft stepping corner to corner, as a 45-degree line does in pixel art.
//
// A 12-unit grid drawn at 48px puts one drawn pixel on 4 css pixels, which is
// exactly what Press Start 2P renders at the close gadget's 32px (its glyphs
// sit on an 8px grid), so the icon and the X are built from the same size of
// pixel. The font carries no arrow glyphs, so a text arrow would fall back to a
// system one. fill inherits currentColor, following the gadget's hover/active
// colors.
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
    ? resolveScreenFormat(state.canvas.screenFormatId, state.canvas.videoStandard)
    : null;
  const openScreenFormat = (): void => {
    actions.dialog.open('SCREEN_FORMAT');
    actions.app.closeMenu();
  };

  const openCanvasSize = (): void => {
    actions.dialog.open('CANVAS_SIZE');
    actions.app.closeMenu();
  };

  return (
    <>
      <div className="screen-status">
        <button
          className="screen-status__segment"
          type="button"
          onClick={openScreenFormat}
          title="Set screen format"
        >
          <span className="screen-status__field">
            <span className="screen-status__label">Resolution</span>
            {screenFormat ? (
              <>
                {screenFormat.name}{' '}
                <Dimensions width={screenFormat.width} height={screenFormat.height} />
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
          title="Set canvas size"
        >
          <span className="screen-status__field">
            <span className="screen-status__label">Canvas</span>
            <Dimensions
              width={state.canvas.resolution.width}
              height={state.canvas.resolution.height}
            />
          </span>
        </button>
        {/* Only once a second page exists, and appended rather than placed
            first so that its arrival shifts nothing already on the strip.
            DPaint never showed this — it swapped the two bitmaps, so it could
            not have named the page — but two identical-looking pages behind a
            one-key swap need saying in a window that also has tabs. Numbered,
            not "Spare": the page you are looking at is never the spare one. */}
        {state.pages.pageCount > 1 && (
          <button
            className="screen-status__segment"
            type="button"
            onClick={(): void => actions.pages.swap()}
            title="Show the other page (j)"
          >
            <span className="screen-status__field">
              <span className="screen-status__label">Page</span>
              {/* Which page, not how many: the count is always two, and the
                  segment is only here at all once there is a second one. The
                  number reads in the value blue like every other reading on
                  the strip. */}
              <b>{state.pages.currentPageIndex + 1}</b>
            </span>
          </button>
        )}
      </div>
      {/* How the simulated screen fills the window. Named for what
          switching it on does, so the resting state needs no label: off, the
          screen keeps its format's aspect ratio, fitted to the window with
          margin only where that ratio demands it; on, it fills the window and
          takes the window's proportions instead. Meaningless at Native, whose
          pixels are square already. */}
      {screenFormat && (
        <button
          className={
            'view-scaling' + (state.canvas.scaleMode === 'stretch' ? ' view-scaling--on' : '')
          }
          type="button"
          aria-pressed={state.canvas.scaleMode === 'stretch'}
          aria-label="Stretch"
          onClick={actions.canvas.toggleScaleMode}
          title="Stretch the screen to fill the window, taking the window's proportions. Turn off to keep the format's own aspect ratio."
        >
          {stretchIcon}
        </button>
      )}
    </>
  );
}
