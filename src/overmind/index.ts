import { IConfig } from 'overmind';
import { namespaced } from 'overmind/config';
import { createHook } from 'overmind-react';
import * as canvas from './canvas';
import * as undo from './undo';
import * as toolbar from './toolbar';

export const config = namespaced({
  canvas,
  undo,
  toolbar,
});

declare module 'overmind' {
  interface Config extends IConfig<typeof config> {}
}

export const useOvermind = createHook<typeof config>();
