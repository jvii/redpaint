import React from 'react';
import { useOvermind } from '../../overmind';
import { colorToRGBString } from '../../tools/util/util';

interface Props {
  colorId: string;
  isSelected: boolean;
  size: number;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onRightClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export function ColorButton({
  colorId,
  isSelected,
  size,
  onClick,
  onRightClick,
}: Props): JSX.Element {
  const { state } = useOvermind();

  const buttonStyle = {
    backgroundColor: colorToRGBString(state.palette.palette[colorId]),
    border: isSelected ? '2px solid white' : '2px solid transparent',
    width: size + 'px',
    heigth: size + 'px',
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
