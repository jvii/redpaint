import { JSX } from 'react';
import { Button, Divider, Slider, ToggleButton, ToggleButtonGroup } from '@mui/material';
import './SymmetrySettings.css';
import { useActions, useAppState } from '../../overmind';
import { Modal } from '../modal/Modal';

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
          <Slider
            value={state.symmetry.order}
            step={1}
            min={1}
            max={40}
            valueLabelDisplay="auto"
            onChange={(event, value): void => actions.symmetry.setOrder(Number(value))}
          />
        </div>
        <div className="symmetry-settings__row">
          <span className="symmetry-settings__label">Type</span>
          <ToggleButtonGroup
            exclusive
            value={state.symmetry.mirror ? 'mirror' : 'cyclic'}
            onChange={(event, value): void => {
              if (value) {
                actions.symmetry.setMirror(value === 'mirror');
              }
            }}
          >
            <ToggleButton value="cyclic">Cyclic</ToggleButton>
            <ToggleButton value="mirror">Mirror</ToggleButton>
          </ToggleButtonGroup>
        </div>
        <div className="symmetry-settings__row">
          <span className="symmetry-settings__label">
            Center: {center ? `${center.x}, ${center.y}` : 'canvas'}
          </span>
          <span className="symmetry-settings__row-buttons">
            <Button variant="outlined" onClick={selectCenter}>
              Select
            </Button>
            <Button variant="outlined" disabled={!center} onClick={actions.symmetry.resetCenter}>
              Reset
            </Button>
          </span>
        </div>
      </div>
      <Divider variant="middle" />
      <Button variant="outlined" onClick={actions.symmetry.cancelSettings}>
        Cancel
      </Button>
      <Button variant="contained" color="primary" onClick={actions.symmetry.closeSettings}>
        OK
      </Button>
    </Modal>
  );
}
