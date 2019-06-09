import * as React from 'react';
import Button from './Button';
import freehandImage from '../../resources/freehandButton.png';

export interface Props {
  onClick: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) | undefined;
}

function ButtonFreehand({onClick}: Props) {

  return (
    <Button name = 'Freehand' image = {freehandImage} onClick = {onClick} ></Button>
  );
}

export default ButtonFreehand;
