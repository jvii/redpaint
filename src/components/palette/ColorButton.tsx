import React from 'react';
import { Color } from '../../types';

interface Props {
  color: Color;
  onClick?: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) | undefined;
}

export function ColorButton({ color, onClick }: Props): JSX.Element {
  const buttonStyle = {
    backgroundColor: rgb(color),
    width: '25px',
    height: '25px',
    border: 'none',
  };
  return <button className="ColorButton" onClick={onClick} style={buttonStyle}></button>;
}

function rgb(color: Color): string {
  return 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
}
