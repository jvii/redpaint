import { JSX } from 'react';
import './SymmetrySettings.css';
import { useActions, useAppState } from '../../overmind';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroSlider } from '../ui/RetroSlider';
import { RetroToggle } from '../ui/RetroToggle';

// The symmetry settings panel — redpaint's equivalent of DPaint's SymRequest
// requester (SYMREQ.C: Cyclic / Mirror / Order / Cancel / Ok), opened by
// right-clicking the symmetry toolbox button (CTRPAN.C case 13). Center
// selection, which DPaint kept as a separate menu item (Picture > Symmetry
// Center), is reachable from here instead.
export function SymmetrySettings(): JSX.Element | null {
  const state = useAppState();
  const actions = useActions();

  if (!state.symmetry.settingsOpen) {
    return null;
  }

  const center = state.symmetry.center;

  const selectCenter = (): void => {
    actions.symmetry.closeSettings();
    if (state.toolbox.activeToolId !== 'symmetryCenterSelectorTool') {
      actions.toolbox.toggleSymmetryCenterSelectionMode();
    }
  };

  return (
    <Modal header="Symmetry">
      <div className="symmetry-settings__container">
        <div className="symmetry-settings__row">
          <span className="symmetry-settings__label">Order: {state.symmetry.order}</span>
          <RetroSlider
            value={state.symmetry.order}
            min={1}
            max={40}
            onChange={(value): void => actions.symmetry.setOrder(value)}
          />
        </div>
        <div className="symmetry-settings__row">
          <span className="symmetry-settings__label">Type</span>
          <RetroToggle
            options={[
              { value: 'cyclic', label: 'Cyclic' },
              { value: 'mirror', label: 'Mirror' },
            ]}
            value={state.symmetry.mirror ? 'mirror' : 'cyclic'}
            onChange={(value): void => actions.symmetry.setMirror(value === 'mirror')}
          />
        </div>
        <div className="symmetry-settings__row">
          <span className="symmetry-settings__label">
            Center: {center ? `${center.x}, ${center.y}` : 'canvas'}
          </span>
          <span className="symmetry-settings__row-buttons">
            <RetroButton onClick={selectCenter}>Select</RetroButton>
            <RetroButton disabled={!center} onClick={actions.symmetry.resetCenter}>
              Reset
            </RetroButton>
          </span>
        </div>
      </div>
      <hr className="retro-divider" />
      <RetroButton variant="secondary" onClick={actions.symmetry.cancelSettings}>
        Cancel
      </RetroButton>
      <RetroButton variant="primary" onClick={actions.symmetry.closeSettings}>
        OK
      </RetroButton>
    </Modal>
  );
}
