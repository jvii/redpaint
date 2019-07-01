import React from 'react';
import { Color } from '../../types';
import { colorToRGBString } from '../../tools/util';

interface Props {
  color: Color;
  onClick?: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) | undefined;
}

export function ColorButton({ color, onClick }: Props): JSX.Element {
  const buttonStyle = {
    backgroundColor: colorToRGBString(color),
    width: '10px',
    height: '10px',
    border: 'none',
    padding: 0,
    margin: 0,
  };
  return <button className="ColorButton" onClick={onClick} style={buttonStyle}></button>;
}

export default ColorButton;
