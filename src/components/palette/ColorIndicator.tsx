import React from 'react';
import { Color } from '../../types';
import { colorToRGBString } from '../../tools/util';

interface Props {
  color: Color;
}

export function ColorIndicator({ color }: Props): JSX.Element {
  const background = {
    textAlign: 'center' as 'center',
    gridArea: 'colorIndicator',
    backgroundColor: 'white',
    width: '50px',
    height: '23px',
    borderWidth: '0px',
    padding: 0,
    margin: 0,
  };
  const foreground = {
    lineHeight: '23px',
    verticalAlign: 'middle',
    height: '22px',
    width: '22px',
    backgroundColor: colorToRGBString(color),
    borderRadius: '50%',
    display: 'inline-block',
  };

  return (
    <div style={background}>
      <span style={foreground}></span>
    </div>
  );
}

export default ColorIndicator;
