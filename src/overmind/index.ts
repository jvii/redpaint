import { IContext } from 'overmind'
import { namespaced } from 'overmind/config';
import {
  createStateHook,
  createActionsHook,
  createEffectsHook,
  createReactionHook
} from 'overmind-react'
import * as app from './app';
import * as canvas from './canvas';
import * as dialog from './dialog';
import * as palette from './palette';
import * as paletteEditor from './paletteEditor';
import * as undo from './undo';
import * as toolbox from './toolbox';
import * as brush from './brush';
import * as tool from './tool';
import * as symmetry from './symmetry';

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
  symmetry,
});

export type Context = IContext<typeof config>

export const useAppState = createStateHook<Context>()
export const useActions = createActionsHook<Context>()
export const useEffects = createEffectsHook<Context>()
export const useReaction = createReactionHook<Context>()

export type OvermindState = typeof config.state;
