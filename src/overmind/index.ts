import { IConfig } from 'overmind';
import { namespaced } from 'overmind/config';
import { createHook } from 'overmind-react';
import * as canvas from './canvas';
import * as palette from './palette';
import * as undo from './undo';
import * as toolbar from './toolbar';
import * as brush from './brush';

export const config = namespaced({
  canvas,
  palette,
  undo,
  toolbar,
  brush,
});

declare module 'overmind' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Config extends IConfig<typeof config> {}
}

export const useOvermind = createHook<typeof config>();

export type OvermindState = typeof config.state;
