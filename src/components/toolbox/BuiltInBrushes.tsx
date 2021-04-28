import React from 'react';
import { useOvermind } from '../../overmind';
import { BuiltInBrushId } from '../../overmind/brush/state';
import './BuiltInBrushes.css';

export function BuiltInBrushes(): JSX.Element {
  return (
    <div className="built-in-brushes-container">
      <div className="built-in-brushes built-in-brushes-dots">
        <BrushButton svg={dot1x1} brushId={1} />
        <BrushButton svg={dot3x3} brushId={2} />
        <BrushButton svg={dot5x5} brushId={3} />
        <BrushButton svg={dot7x7} brushId={4} />
      </div>
      <div className="built-in-brushes built-in-brushes-squares">
        <BrushButton svg={square8x8} brushId={8} />
        <BrushButton svg={square6x6} brushId={7} />
        <BrushButton svg={square4x4} brushId={6} />
        <BrushButton svg={square2x2} brushId={5} />
      </div>
      <div className="built-in-brushes built-in-brushes-dithers">
        <BrushButton svg={dither3x3} brushId={9} />
        <BrushButton svg={dither7x6} brushId={10} />
      </div>
    </div>
  );
}

interface ButtonProps {
  svg: JSX.Element;
  brushId: BuiltInBrushId;
}

function BrushButton({ svg, brushId }: ButtonProps): JSX.Element {
  const { state, actions } = useOvermind();
  const onClick = (): void => {
    actions.brush.selectBuiltInBrush(brushId);
  };

  const isSelected = state.brush.selectedBuiltInBrushId === brushId;
  return (
    <div
      className={'built-in-brush-div' + ' built-in-brush-bg' + (isSelected ? '--selected' : '')}
      onClick={onClick}
    >
      {svg}
    </div>
  );
}

const dot1x1 = (
  <svg className="built-in-brush-svg" viewBox="0 0 7 7">
    <rect x="3" y="3" width="1" height="1" />
  </svg>
);

const dot3x3 = (
  <svg className="built-in-brush-svg" viewBox="0 0 26.458 26.458">
    <g transform="translate(-3.635 -3.0423)" fillRule="evenodd" strokeWidth="1.8715">
      <rect x="14.346" y="12.989" width="5.2913" height="5.2913" />
      <rect x="14.346" y="7.6977" width="5.2913" height="5.2913" />
      <rect x="19.637" y="12.989" width="5.2913" height="5.2913" />
      <rect x="14.346" y="18.28" width="5.2913" height="5.2913" />
      <rect x="9.0547" y="12.989" width="5.2913" height="5.2913" />
    </g>
  </svg>
);

const dot5x5 = (
  <svg className="built-in-brush-svg" viewBox="0 0 26.458 26.458">
    <g transform="translate(-3.635 -3.0423)" fillRule="evenodd">
      <rect x="10.556" y="7.34" width="12.395" height="18.499" strokeWidth=".93782" />
      <rect x="6.8739" y="10.89" width="19.807" height="11.647" strokeWidth=".97565" />
    </g>
  </svg>
);

const dot7x7 = (
  <svg
    className="built-in-brush-svg built-in-brush-svg-7x7"
    viewBox="0 0 26.458 26.458"
    preserveAspectRatio="none"
  >
    <g transform="translate(-3.635 -3.0423)" fillRule="evenodd">
      <rect x="9.2663" y="8.212" width="15.109" height="16.506" strokeWidth=".97805" />
      <rect x="6.4379" y="11.131" width="20.866" height="10.392" strokeWidth=".94591" />
      <rect x="12.168" y="5.16" width="9.4674" height="22.423" strokeWidth="1.0476" />
    </g>
  </svg>
);

const square2x2 = (
  <svg className="built-in-brush-svg" viewBox="0 0 10 10">
    <rect x="3" y="3" width="4" height="4" />
  </svg>
);

const square4x4 = (
  <svg className="built-in-brush-svg" viewBox="0 0 10 10">
    <rect x="2" y="2" width="6" height="6" />
  </svg>
);

const square6x6 = (
  <svg className="built-in-brush-svg" viewBox="0 0 10 10">
    <rect x="2" y="2" width="6" height="6" />
  </svg>
);

const square8x8 = (
  <svg className="built-in-brush-svg" viewBox="0 0 10 10">
    <rect x="1" y="1" width="8" height="8" />
  </svg>
);

const dither3x3 = (
  <svg className="built-in-brush-svg" viewBox="0 0 7 7">
    <rect x="4" y="2" width="1" height="1" />
    <rect x="2" y="3" width="1" height="1" />
    <rect x="4" y="4" width="1" height="1" />
  </svg>
);

const dither7x6 = (
  <svg className="built-in-brush-svg" viewBox="0 0 7 8">
    <rect x="4" y="1" width="1" height="1" />
    <rect x="1" y="3" width="1" height="1" />
    <rect x="4" y="4" width="1" height="1" />
    <rect x="7" y="4" width="1" height="1" />
    <rect x="4" y="6" width="1" height="1" />
  </svg>
);
