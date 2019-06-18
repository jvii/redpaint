import React from 'react';
import './Button.css';

interface Props {
  onClick?:
    | ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void)
    | undefined;
}

export function ButtonFreehand({ onClick }: Props): JSX.Element {
  return <button className="Freehand" onClick={onClick}></button>;
}

export function ButtonLine({ onClick }: Props): JSX.Element {
  return <button className="Line" onClick={onClick}></button>;
}
