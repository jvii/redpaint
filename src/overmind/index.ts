import { IConfig } from 'overmind';
import { namespaced } from 'overmind/config';
import { createHook } from 'overmind-react';
import * as app from './app';
import * as canvas from './canvas';
import * as dialog from './dialog';
import * as palette from './palette';
import * as paletteEditor from './paletteEditor';
import * as undo from './undo';
import * as toolbox from './toolbox';
import * as brush from './brush';
import * as tool from './tool';

export const config = namespaced({
  app,
  canvas,
  dialog,
  palette,
  paletteEditor,
  undo,
  toolbox,
  tool,
  brush,
});

declare module 'overmind' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Config
    extends IConfig<{
      state: typeof config.state;
      actions: typeof config.actions;
      effects: typeof config.effects;
    }> {}
  // Due to circular typing we have to define an
  // explicit typing of state, actions and effects since
  // TS 3.9
}

export const useOvermind = createHook<typeof config>();

export type OvermindState = typeof config.state;
