import * as React from 'react';
import './Button.css';

export interface Props {
  name: string;
  image?: string;
  onClick?: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) | undefined;
}

function Button({name, image, onClick}: Props) {

  return (
    <button
      //className = {'button {name}'}
      onClick={onClick}
      >
      <img src={image} />
    </button>
  );
}

export default Button;
