import React from 'react';
import { ColorButton } from './ColorButton';
import { Color } from '../../types';
import { PaletteState, Action } from './PaletteState';
import './Palette.css';

export interface Props {
  paletteState: PaletteState;
  dispatch: React.Dispatch<Action>;
}

function Palette({ paletteState, dispatch }: Props): JSX.Element {
  const createColorButton = (color: Color, index: number): JSX.Element => {
    return (
      <ColorButton
        color={color}
        onClick={(): void => dispatch({ type: 'setForegroundColor', color: color })}
        onRightClick={(): void => dispatch({ type: 'setBackgroundColor', color: color })}
        key={index}
      />
    );
  };

  return (
    <div className="PaletteArea">
      {paletteState.palette.map((color, index): JSX.Element => createColorButton(color, index))}
    </div>
  );
}

export default Palette;
