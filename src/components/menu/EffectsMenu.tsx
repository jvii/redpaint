import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { Gadget, GadgetCluster, GadgetGroup } from './MenuGadgets';
import {
  BackgroundFixIcon,
  StencilIcon,
  StencilFreeIcon,
  StencilLockFgIcon,
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
  const backgroundFixed = state.background.fixed;
  const colorCount = state.palette.paletteArray.length;

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
              icon={<StencilLockFgIcon />}
              label="Lock FG"
              stacked
              title={
                backgroundFixed
                  ? 'Lock everything painted since the background was fixed'
                  : 'Fix the background first: this locks what was painted after it'
              }
              disabled={!backgroundFixed}
              onClick={instant(actions.stencil.lockPainted)}
            />
            <Gadget
              icon={<StencilReverseIcon />}
              label="Reverse"
              stacked
              title={exists ? 'Lock what is unlocked, and the other way round' : 'No stencil yet'}
              disabled={!exists}
              onClick={instant((): void => actions.stencil.reverse(colorCount))}
            />
          </GadgetGroup>
          <GadgetGroup>
            {/* These two stay open: On so its pressed state is visible, Free so the
                gadgets it disables can be seen going dim (docs/style-guide.md). */}
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
              onClick={(): void => actions.stencil.free()}
            />
          </GadgetGroup>
        </GadgetCluster>
        <GadgetCluster head="Background">
          <GadgetGroup>
            <Gadget
              icon={<BackgroundFixIcon />}
              label="Fix"
              stacked
              on={backgroundFixed}
              title="Freeze the picture as a background: CLR then erases only what is painted after it"
              onClick={(): void => actions.background.fix()}
            />
            <Gadget
              icon={<StencilFreeIcon />}
              label="Free"
              stacked
              title={backgroundFixed ? 'Release the background' : 'No fixed background'}
              disabled={!backgroundFixed}
              onClick={(): void => actions.background.free()}
            />
          </GadgetGroup>
        </GadgetCluster>
      </div>
    </div>
  );
}
