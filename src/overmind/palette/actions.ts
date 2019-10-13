import { Action } from 'overmind';

export const setForegroundColor: Action<string> = ({ state }, key): void => {
  state.palette.foregroundColorId = key;
};

export const setBackgroundColor: Action<string> = ({ state }, key): void => {
  state.palette.backgroundColorId = key;
};
