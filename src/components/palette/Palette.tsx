import React from 'react';
import { ColorButton } from './ColorButton';
import { Color } from '../../types';
import './Palette.css';

export interface Props {
  setSelectedColor: (color: Color) => void;
}

function Palette({ setSelectedColor }: Props): JSX.Element {
  const red: Color = { r: 255, g: 0, b: 0 };
  const blue: Color = { r: 0, g: 0, b: 255 };
  const green: Color = { r: 0, g: 255, b: 0 };
  const cyan: Color = { r: 0, g: 255, b: 255 };

  return (
    <div className="Palette">
      <ColorButton color={red} onClick={(): void => setSelectedColor(red)} />
      <ColorButton color={blue} onClick={(): void => setSelectedColor(blue)} />
      <ColorButton color={green} onClick={(): void => setSelectedColor(green)} />
      <ColorButton color={cyan} onClick={(): void => setSelectedColor(cyan)} />
    </div>
  );
}

export default Palette;
