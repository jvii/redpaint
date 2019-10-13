import React from 'react';
import './toolbarButtons.css';

interface Props {
  isSelected: boolean;
  onClick?: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) | undefined;
  onRightClick?: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) | undefined;
}

export function ButtonFreehand({ isSelected, onClick }: Props): JSX.Element {
  return (
    <button
      className={'ToolbarButton ' + (isSelected ? 'FreehandSelected' : 'Freehand')}
      onClick={onClick}
    ></button>
  );
}

export function ButtonLine({ isSelected, onClick }: Props): JSX.Element {
  return (
    <button
      className={'ToolbarButton ' + (isSelected ? 'LineSelected' : 'Line')}
      onClick={onClick}
    ></button>
  );
}

export function ButtonFloodFill({ isSelected, onClick }: Props): JSX.Element {
  return (
    <button
      className={'ToolbarButton ' + (isSelected ? 'FloodFillSelected' : 'FloodFill')}
      onClick={onClick}
    ></button>
  );
}

export function ButtonZoom({ isSelected, onClick }: Props): JSX.Element {
  return (
    <button
      className={'ToolbarButton ' + (isSelected ? 'ZoomSelected' : 'Zoom')}
      onClick={onClick}
    ></button>
  );
}

export function ButtonBrushSelect({ isSelected, onClick }: Props): JSX.Element {
  return (
    <button
      className={'ToolbarButton ' + (isSelected ? 'BrushSelectSelected' : 'BrushSelect')}
      onClick={onClick}
    ></button>
  );
}

export function ButtonUndo({ onClick, onRightClick }: Props): JSX.Element {
  const handleRightClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    if (onRightClick !== undefined) {
      onRightClick(event);
    }
    event.preventDefault();
  };
  return (
    <button
      className="ToolbarButton Undo"
      onClick={onClick}
      onContextMenu={handleRightClick}
    ></button>
  );
}

export function ButtonCLR({ onClick }: Props): JSX.Element {
  return <button className="ToolbarButton CLR" onClick={onClick}></button>;
}
