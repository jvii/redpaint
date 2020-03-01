import React from 'react';
import { ColorButton } from './ColorButton';
import { Color } from '../../types';
import { useOvermind } from '../../overmind';
import './Palette.css';

function Palette(): JSX.Element {
  const { state, actions } = useOvermind();

  const createColorButton = (color: Color, index: number): JSX.Element => {
    return (
      <ColorButton
        color={color}
        isSelected={index.toString() === state.palette.foregroundColorId}
        onClick={(): void => actions.palette.setForegroundColor(index.toString())}
        onRightClick={(): void => actions.palette.setBackgroundColor(index.toString())}
        key={index}
      />
    );
  };

  return (
    <div className="palette">
      {state.palette.paletteArray.map(
        (color, index): JSX.Element => createColorButton(color, index)
      )}
    </div>
  );
}

export default Palette;
