import React from 'react';
import { ColorButton } from './ColorButton';
import { Color } from '../../types';
import { PaletteState, Action } from './PaletteState';
import './Palette.css';

export interface Props {
  paletteDispatch: React.Dispatch<Action>;
  paletteState: PaletteState;
}

function Palette({ paletteDispatch, paletteState }: Props): JSX.Element {
  const createColorButton = (color: Color, index: number): JSX.Element => {
    return (
      <ColorButton
        color={color}
        isSelected={index === paletteState.foregroundColorKey}
        onClick={(): void =>
          paletteDispatch({ type: 'setForegroundColor', color: color, colorKey: index })
        }
        onRightClick={(): void =>
          paletteDispatch({ type: 'setBackgroundColor', color: color, colorKey: index })
        }
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
