import React from 'react';
import './toolbarButtons.css';

interface Props {
  onClick?: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) | undefined;
}

export function ButtonFreehand({ onClick }: Props): JSX.Element {
  return <button className="ToolbarButton Freehand" onClick={onClick}></button>;
}

export function ButtonLine({ onClick }: Props): JSX.Element {
  return <button className="ToolbarButton Line" onClick={onClick}></button>;
}

export function ButtonCLR({ onClick }: Props): JSX.Element {
  return <button className="ToolbarButton CLR" onClick={onClick}></button>;
}
