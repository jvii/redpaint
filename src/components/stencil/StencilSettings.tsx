import { JSX } from 'react';
import './StencilSettings.css';
import { useActions, useAppState } from '../../overmind';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import Palette, { paletteColumnCount, paletteRowCount } from '../palette/Palette';

const ROW_HEIGHT_PX = 35;
const COLUMN_WIDTH_PX = 48;
// Everything in the requester that isn't the palette: the actions column, the
// gap, the padding. The window grows by whatever the columns need on top.
const CHROME_WIDTH_PX = 310;
// vh inside the modal, which carries the UI scale's `zoom`, needs the scale
// divided back out to mean the same number of real pixels (see Menubar.css).
const MAX_PALETTE_HEIGHT = 'calc(62vh / var(--ui-scale, 1))';

// DPaint's Stencil requester (docs/stencil.md): tick the colors to lock, then
// Make freezes the mask from the picture as it is now. The ticks can also be
// set by clicking the picture itself, which is what canvasPickable is for.
export function StencilSettings(): JSX.Element | null {
  const state = useAppState();
  const actions = useActions();

  if (!state.stencil.requesterOpen) {
    return null;
  }

  const colorCount = state.palette.paletteArray.length;
  // The grid is a box the swatches divide (StencilSettings.css). Rows at the
  // size the palette editor's grid uses, unless there are so many that they
  // have to share the screen's worth of height instead - a 256-color palette
  // takes what it can get rather than growing the requester past the viewport.
  const paletteHeight = `min(${paletteRowCount(colorCount) * ROW_HEIGHT_PX}px, ${MAX_PALETTE_HEIGHT})`;
  // A deep palette is 8 columns rather than 4, and they keep their width: the
  // window widens instead of squeezing the swatches and the gutters their marks
  // live in.
  const paletteWidth = paletteColumnCount(colorCount) * COLUMN_WIDTH_PX;
  const locked = state.stencil.lockedColors.flatMap((isLocked, colorNumber) =>
    isLocked ? [String(colorNumber)] : []
  );

  return (
    <Modal header="Make Stencil" width={CHROME_WIDTH_PX + paletteWidth} canvasPickable>
      <div className="stencil-settings__container">
        <div className="stencil-settings__actions">
          <RetroButton onClick={(): void => actions.stencil.invertColors(colorCount)}>
            Invert
          </RetroButton>
          <RetroButton variant="secondary" onClick={actions.stencil.clearColors}>
            Clear
          </RetroButton>
          <p className="supporting-text stencil-settings__note">
            Select the colors to lock. You can also click the picture to lock the color you point
            at.
          </p>
        </div>
        <div className="stencil-settings__locked">
          <span className="stencil-settings__label">Locked:</span>
          <div
            className="stencil-settings__palette"
            style={{ width: paletteWidth, height: paletteHeight }}
          >
            <Palette
              lockedColorIds={locked}
              onSelectColor={(colorId): void => actions.stencil.toggleColor(Number(colorId))}
              fillHeight
            />
          </div>
        </div>
      </div>
      <RetroButton variant="secondary" onClick={actions.stencil.cancelRequester}>
        Cancel
      </RetroButton>
      <RetroButton variant="primary" onClick={actions.stencil.make}>
        Make
      </RetroButton>
    </Modal>
  );
}
