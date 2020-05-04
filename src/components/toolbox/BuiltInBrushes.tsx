import React from 'react';
import { useOvermind } from '../../overmind';
import { BuiltInBrushId } from '../../overmind/brush/state';
import './BuiltInBrushes.css';

export function BuiltInBrushes(): JSX.Element {
  return (
    <>
      <div className="built-in-brushes built-in-brushes-dots">
        <BrushButton brushId={1} />
        <BrushButton brushId={2} />
        <BrushButton brushId={3} />
        <BrushButton brushId={4} />
      </div>
      <div className="built-in-brushes built-in-brushes-squares">
        <BrushButton brushId={8} />
        <BrushButton brushId={7} />
        <BrushButton brushId={6} />
        <BrushButton brushId={5} />
      </div>
    </>
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
    <div className={'built-in-brush-div built-in-brush-bg' + (isSelected ? '--selected' : '')}>
      <button
        className={
          'built-in-brush-svg brush' + (brushId.toString() + (isSelected ? '--selected' : ''))
        }
        onClick={onClick}
      ></button>
    </div>
  );
}
