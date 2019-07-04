import React from 'react';
import { PaletteState } from '../palette/PaletteState';
import { colorToRGBString } from '../../tools/util';

interface Props {
  paletteState: PaletteState;
}

export function ColorIndicator({ paletteState }: Props): JSX.Element {
  const background = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gridArea: 'colorIndicator',
    width: '50px',
    height: '25px',
    borderWidth: '0px',
    padding: 0,
    margin: 0,
    backgroundColor: colorToRGBString(paletteState.backgroundColor),
  };
  const foreground = {
    height: '20px',
    width: '20px',
    borderRadius: '50%',
    backgroundColor: colorToRGBString(paletteState.foregroundColor),
  };

  return (
    <div style={background}>
      <div style={foreground}></div>
    </div>
  );
}

export default ColorIndicator;
