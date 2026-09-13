import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { Gadget, GadgetCluster, GadgetGroup } from './MenuGadgets';
import {
  StencilIcon,
  StencilFreeIcon,
  StencilRemakeIcon,
  StencilReverseIcon,
} from './transformIcons';
import { shortcutCap } from '../ui/shortcutCap';
import './DrawerMenu.css';

// DPaint's Effects menu (docs/stencil.md): masks, freezing the background, and
// perspective. Only Stencil so far.
export function EffectsMenu(): JSX.Element {
  const actions = useActions();
  const state = useAppState();
  const { exists, enabled } = state.stencil;

  const instant = (action: () => void) => (): void => {
    action();
    actions.app.closeMenu();
  };

  return (
    <div className="drawer-menu">
      <div className="wb-cluster__head drawer-menu__head">Effects</div>
      <div className="drawer-menu__row">
        <GadgetCluster head="Stencil">
          <GadgetGroup>
            <Gadget
              icon={<StencilIcon />}
              label="Make"
              stacked
              title="Choose the colors to lock, then freeze the mask"
              onClick={instant(actions.stencil.openRequester)}
            />
            <Gadget
              icon={<StencilRemakeIcon />}
              label="Remake"
              stacked
              title={
                exists
                  ? 'Retake the mask from the picture as it is now, same colors'
                  : 'No stencil to remake'
              }
              disabled={!exists}
              onClick={instant(actions.stencil.remake)}
            />
            <Gadget
              icon={<StencilReverseIcon />}
              label="Reverse"
              stacked
              title={exists ? 'Lock what is unlocked, and the other way round' : 'No stencil yet'}
              disabled={!exists}
              onClick={instant(actions.stencil.reverse)}
            />
          </GadgetGroup>
          <GadgetGroup>
            {/* Stays open so the pressed state is visible (docs/style-guide.md). */}
            <Gadget
              icon={<StencilIcon />}
              label="On"
              stacked
              shortcut={shortcutCap('-')}
              on={enabled}
              title={exists ? 'Suspend the stencil, keeping it' : 'No stencil yet'}
              disabled={!exists}
              onClick={(): void => actions.stencil.toggleEnabled()}
            />
            <Gadget
              icon={<StencilFreeIcon />}
              label="Free"
              stacked
              title={exists ? 'Discard the stencil' : 'No stencil to free'}
              disabled={!exists}
              onClick={instant(actions.stencil.free)}
            />
          </GadgetGroup>
        </GadgetCluster>
      </div>
    </div>
  );
}
