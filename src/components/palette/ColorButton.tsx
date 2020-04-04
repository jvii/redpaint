import React from 'react';
import { Color } from '../../types';
import { colorToRGBString } from '../../tools/util/util';

interface Props {
  color: Color;
  isSelected: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onRightClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export function ColorButton({ color, isSelected, onClick, onRightClick }: Props): JSX.Element {
  const buttonStyle = {
    backgroundColor: colorToRGBString(color),
    border: isSelected ? '2px solid white' : 'none',
    width: '100%',
    heigth: '100%',
    padding: 0,
    margin: 0,
    outline: 'none',
  };

  const handleRightClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    onRightClick(event);
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
