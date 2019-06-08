import * as React from 'react';
import Button from './Button';
import freehandImage from './freehandButton.png';

export interface Props {
  onClick: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) | undefined;
}

function ButtonFreehand({onClick}: Props) {

  return (
    <Button name = 'F' image = {freehandImage} onClick = {onClick} ></Button>
  );
}

export default ButtonFreehand;
