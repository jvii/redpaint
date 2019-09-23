import { Action } from 'overmind';

export const setForegroundColor: Action<string> = ({ state }, key) => {
  state.palette.foregroundColorId = key;
};

export const setBackgroundColor: Action<string> = ({ state }, key) => {
  state.palette.backgroundColorId = key;
};

