import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { RetroToggle } from '../ui/RetroToggle';
import { UI_SCALES } from '../../uiScale';
import './DrawerMenu.css';

// The preferences drawer: app-wide settings that aren't part of the document
// (so nothing here belongs in Picture or Brush). Mutually exclusive with
// those two — see Menu.tsx's app.openDrawer radio group. Settings are
// RetroToggles rather than gadgets, so unlike the other drawers this one has
// no GadgetCluster; the cluster subhead is reused on its own to label each.
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
      </div>
      <div className="drawer-menu__spacer" />
    </div>
  );
}
