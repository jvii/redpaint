import { Context } from '../../overmind';
import { Point } from '../../types';

export const setCenter = (context: Context, center: Point | null): void => {
  context.state.symmetry.center = center;
};

export const setOrder = (context: Context, order: number): void => {
  context.state.symmetry.order = Math.max(1, Math.min(40, Math.round(order)));
};

export const setMirror = (context: Context, mirror: boolean): void => {
  context.state.symmetry.mirror = mirror;
};

export const resetCenter = (context: Context): void => {
  context.state.symmetry.center = null;
};

export const openSettings = (context: Context): void => {
  const { center, order, mirror } = context.state.symmetry;
  context.state.symmetry.settingsSnapshot = {
    center: center ? { ...center } : null,
    order,
    mirror,
  };
  context.state.symmetry.settingsOpen = true;
};

export const closeSettings = (context: Context): void => {
  context.state.symmetry.settingsOpen = false;
  context.state.symmetry.settingsSnapshot = null;
};

// Restore the values from when the panel was opened, then close.
export const cancelSettings = (context: Context): void => {
  const snapshot = context.state.symmetry.settingsSnapshot;
  if (snapshot) {
    context.state.symmetry.center = snapshot.center;
    context.state.symmetry.order = snapshot.order;
    context.state.symmetry.mirror = snapshot.mirror;
  }
  context.actions.symmetry.closeSettings();
};
