import React from 'react';
import './Button.css';

export interface ButtonProps {
  className: string;
  onClick?:
    | ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void)
    | undefined;
}

export function Button({ className, onClick }: ButtonProps): JSX.Element {
  return <button className={className} onClick={onClick}></button>;
}

export interface Props {
  onClick?:
    | ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void)
    | undefined;
}

export function ButtonFreehand({ onClick }: Props): JSX.Element {
  return <Button className="Freehand" onClick={onClick}></Button>;
}

export function ButtonLine({ onClick }: Props): JSX.Element {
  return <Button className="Line" onClick={onClick}></Button>;
}
