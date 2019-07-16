import React from 'react';
import { Color } from '../../types';
import { colorToRGBString } from '../../tools/util';

interface Props {
  color: Color;
  isSelected: boolean;
  onClick?: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) | undefined;
  onRightClick?: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) | undefined;
}

export function ColorButton({ color, isSelected, onClick, onRightClick }: Props): JSX.Element {
  const buttonStyle = {
    backgroundColor: colorToRGBString(color),
    border: isSelected ? '2px solid white' : 'none',
    width: '10px',
    height: '10px',
    padding: 0,
    margin: 0,
    outline: 'none',
  };

  const handleRightClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    if (onRightClick !== undefined) {
      onRightClick(event);
    }
    event.preventDefault();
  };

  return (
    <button
      className="ColorButton"
      onClick={onClick}
      onContextMenu={handleRightClick}
      style={buttonStyle}
    ></button>
  );
}

export default ColorButton;
