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
