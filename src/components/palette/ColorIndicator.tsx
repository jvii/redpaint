import React from 'react';
import { PaletteState } from '../palette/PaletteState';
import { colorToRGBString } from '../../tools/util';

interface Props {
  paletteState: PaletteState;
}

export function ColorIndicator({ paletteState }: Props): JSX.Element {
  const background = {
    backgroundColor: colorToRGBString(paletteState.backgroundColor),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gridArea: 'colorIndicator',
    width: '50px',
    height: '25px',
    borderWidth: '0px',
    padding: 0,
    margin: 0,
  };
  const foreground = {
    backgroundColor: colorToRGBString(paletteState.foregroundColor),
    height: '20px',
    width: '20px',
    borderRadius: '50%',
  };

  return (
    <div style={background}>
      <div style={foreground}></div>
    </div>
  );
}

export default ColorIndicator;
