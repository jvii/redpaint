import React from 'react';
import { useOvermind } from '../../overmind';
import { BuiltInBrushId } from '../../overmind/brush/state';
import './BuiltInBrushes.css';

export function BuiltInBrushes(): JSX.Element {
  return (
    <div className="built-in-brushes">
      <BrushButton brushId={1} />
      <BrushButton brushId={2} />
      <BrushButton brushId={3} />
      <BrushButton brushId={4} />
    </div>
  );
}

interface ButtonProps {
  brushId: BuiltInBrushId;
}

function BrushButton({ brushId }: ButtonProps): JSX.Element {
  const { state, actions } = useOvermind();
  const onClick = (): void => {
    actions.brush.selectBuiltInBrush(brushId);
  };
  const isSelected = state.brush.selectedBuiltInBrushId === brushId;
  return (
    <button
      className={'built-in-brush brush' + (brushId.toString() + (isSelected ? '--selected' : ''))}
      onClick={onClick}
    ></button>
  );
}
