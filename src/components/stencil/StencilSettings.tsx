import { JSX } from 'react';
import './StencilSettings.css';
import { useActions, useAppState } from '../../overmind';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import Palette from '../palette/Palette';

// DPaint's Stencil requester (docs/stencil.md): tick the colors to lock, then
// Make freezes the mask from the picture as it is now.
export function StencilSettings(): JSX.Element | null {
  const state = useAppState();
  const actions = useActions();

  if (!state.stencil.requesterOpen) {
    return null;
  }

  const colorCount = state.palette.paletteArray.length;
  const locked = state.stencil.lockedColors.flatMap((isLocked, colorNumber) =>
    isLocked ? [String(colorNumber)] : []
  );

  return (
    <Modal header="Stencil">
      <div className="stencil-settings__container">
        <div className="stencil-settings__actions">
          <RetroButton variant="secondary" onClick={actions.stencil.clearColors}>
            Clear
          </RetroButton>
          <RetroButton
            variant="secondary"
            onClick={(): void => actions.stencil.invertColors(colorCount)}
          >
            Invert
          </RetroButton>
          <p className="supporting-text stencil-settings__note">
            Painting cannot touch the pixels holding a locked color.
          </p>
        </div>
        <div className="stencil-settings__locked">
          <span className="stencil-settings__label">Locked:</span>
          <div className="stencil-settings__palette">
            <Palette
              lockedColorIds={locked}
              onSelectColor={(colorId): void => actions.stencil.toggleColor(Number(colorId))}
              columnDividers
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
