import React from 'react';
import { ColorButton } from './ColorButton';
import { Color } from '../../types';
import { hslToColor } from '../../tools/util';
import './Palette.css';

export interface Props {
  setSelectedColor: (color: Color) => void;
}

function Palette({ setSelectedColor }: Props): JSX.Element {
  const palette = createPalette(200);

  const createColorButton = (color: Color): JSX.Element => {
    return <ColorButton color={color} onClick={(): void => setSelectedColor(color)} />;
  };

  return <div className="PaletteArea"> {palette.map(createColorButton)}</div>;
}

function createColor(range: number, value: number): Color {
  const minHue = 0;
  const maxHue = 360;
  const currentPercent = value / range;
  const hue = currentPercent * (maxHue - minHue) + minHue;
  return hslToColor(hue, 1, 0.5);
}

function createPalette(colors: number): Color[] {
  const palette: Color[] = [];
  for (let i = 0; i < colors; i++) {
    const color = createColor(colors, i);
    palette.push(color);
  }
  return palette;
}

export default Palette;
