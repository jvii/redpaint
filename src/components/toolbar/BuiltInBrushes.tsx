import React from 'react';
import { useOvermind } from '../../overmind';
import './BuiltInBrushes.css';
import { PixelBrush } from '../../brush/PixelBrush';

export function BuiltInBrushes(): JSX.Element {
  return (
    <div className="BuiltInBrushes">
      <BrushButton brush={1} />
      <BrushButton brush={2} />
      <BrushButton brush={3} />
      <BrushButton brush={4} />
    </div>
  );
}

interface ButtonProps {
  brush: number;
}

function BrushButton({ brush }: ButtonProps): JSX.Element {
  const { state, actions } = useOvermind();
  const onClick = (): void => {
    actions.toolbar.selectBuiltInBrush(brush);
    actions.brush.setBrush(new PixelBrush());
    console.log('select built in brush');
  };
  const isSelected = state.toolbar.selectedBuiltInBrush === brush;
  return (
    <button
      className={'BuiltInBrush ' + 'Brush' + brush.toString() + (isSelected ? 'Selected' : '')}
      onClick={onClick}
    ></button>
  );
}
