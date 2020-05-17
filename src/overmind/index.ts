import { IConfig } from 'overmind';
import { namespaced } from 'overmind/config';
import { createHook } from 'overmind-react';
import * as app from './app';
import * as canvas from './canvas';
import * as dialog from './dialog';
import * as palette from './palette';
import * as undo from './undo';
import * as toolbox from './toolbox';
import * as brush from './brush';
import * as tool from './tool';

export const config = namespaced({
  app,
  canvas,
  dialog,
  palette,
  undo,
  toolbox,
  tool,
  brush,
});

declare module 'overmind' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Config extends IConfig<typeof config> {}
}

export const useOvermind = createHook<typeof config>();

export type OvermindState = typeof config.state;
