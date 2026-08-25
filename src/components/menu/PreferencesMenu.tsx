import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { RetroToggle } from '../ui/RetroToggle';
import { UI_SCALES } from '../../uiScale';
import { MAX_UNDO_BYTES } from '../../overmind/undo/UndoBuffer';
import './DrawerMenu.css';

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// The preferences drawer: app-wide settings that aren't part of the document
// (so nothing here belongs in Picture or Brush). Mutually exclusive with those
// two: see Menu.tsx's app.openDrawer radio group. Settings are RetroToggles
// rather than gadgets, so unlike the other drawers this one has no
// GadgetCluster; the cluster subhead is reused on its own to label each.
export function PreferencesMenu(): JSX.Element {
  const actions = useActions();
  const state = useAppState();

  return (
    <div className="drawer-menu">
      <div className="wb-cluster__head drawer-menu__head">Preferences</div>
      <div className="drawer-menu__row">
        {/* PROTOTYPE (uiScale.ts): shrinks the menubar, the menu panel, the
            toolbox column and the requesters, leaving the canvas untouched —
            for Windows display scaling and short screens, where the chrome is
            laid out in CSS pixels the OS has already made bigger. */}
        <div className="wb-cluster">
          <div className="wb-cluster__subhead">UI Size</div>
          <RetroToggle
            variant="row"
            value={String(state.app.uiScale)}
            onChange={(value): void => actions.app.setUiScale(Number(value))}
            options={UI_SCALES.map((scale) => ({
              value: String(scale),
              label: `${Math.round(scale * 100)}%`,
            }))}
          />
        </div>
        {/* Shows the cursor position at the menu bar's right-hand end, where
            DPaint put it. On/Off rather than a pressed gadget, matching UI
            Size beside it. */}
        <div className="wb-cluster">
          <div className="wb-cluster__subhead">Coordinates</div>
          <RetroToggle
            variant="row"
            value={state.app.showCoordinates ? 'on' : 'off'}
            onChange={(value): void => actions.app.setShowCoordinates(value === 'on')}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'on', label: 'On' },
            ]}
          />
        </div>
      </div>
      <div className="drawer-menu__row">
        {/* Not a setting — a readout, and deliberately somewhere quiet. History
            is bounded by bytes (UndoBuffer's limits), so on a large canvas it
            stops going back at some point and this is the only thing that
            explains why; but the buffer manages itself, there's nothing for the
            user to do about the number, and the limit becomes near-unreachable
            once snapshots are dirty-rect patches. So it stays out of the
            always-visible chrome — a fact you can look up, not one to watch. */}
        <div className="wb-cluster">
          <div className="wb-cluster__subhead">Undo Memory</div>
          <div className="prefs-menu__readout">
            {formatMegabytes(state.undo.bufferBytes)} / {formatMegabytes(MAX_UNDO_BYTES)}
            {' · '}
            {state.undo.bufferEntryCount} levels
          </div>
        </div>
      </div>
      <div className="drawer-menu__spacer" />
    </div>
  );
}
