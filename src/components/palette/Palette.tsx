import React, { useRef, useState, useLayoutEffect } from 'react';
import { ColorButton } from './ColorButton';
import { Color } from '../../types';
import { useOvermind } from '../../overmind';
import { overmind } from '../..';
import { Debounce } from '../../tools/util/Debounce';
import './Palette.css';

function Palette(): JSX.Element {
  const { state, actions } = useOvermind();
  const containerRef = useRef<HTMLDivElement>(document.createElement('div'));

  const size = useCalcColorButtonSize(containerRef, overmind.state.palette.paletteArray.length);

  const createColorButton = (color: Color, index: number): JSX.Element => {
    return (
      <ColorButton
        color={color}
        isSelected={index.toString() === state.palette.foregroundColorId}
        size={size}
        onClick={(): void => actions.palette.setForegroundColor(index.toString())}
        onRightClick={(): void => actions.palette.setBackgroundColor(index.toString())}
        key={index}
      />
    );
  };

  return (
    <div className="palette" ref={containerRef}>
      {state.palette.paletteArray.map(
        (color, index): JSX.Element => createColorButton(color, index)
      )}
    </div>
  );
}

// Custom hook to calculate an optimal size for a color button,
// according to palette container size.
function useCalcColorButtonSize(
  ref: React.MutableRefObject<HTMLDivElement>,
  colors: number
): number {
  // useState to update component on window resize
  const [, setSize] = useState([0, 0]);
  useLayoutEffect(() => {
    const debounce = new Debounce(50);
    function updateSize(): void {
      debounce.call(() => setSize([window.innerWidth, window.innerHeight]));
    }
    window.addEventListener('resize', updateSize);
    setSize([window.innerWidth, window.innerHeight]);
    return (): void => window.removeEventListener('resize', updateSize);
  }, []);
  if (ref.current === null) {
    return 0;
  }
  return calcButtonSize(ref.current.clientHeight, ref.current.clientWidth, colors);
}

// adapted from https://math.stackexchange.com/questions/466198/algorithm-to-get-the-maximum-size-of-n-squares-that-fit-into-a-rectangle-with-a
function calcButtonSize(height: number, width: number, colors: number): number {
  const px = Math.ceil(Math.sqrt((colors * width) / height));
  let sx: number;
  if (Math.floor((px * height) / width) * px < colors) {
    sx = height / Math.ceil((px * height) / width); // does not fit, y/(x/px)=px*y/x
  } else {
    sx = width / px;
  }
  sx = width / px;
  const py = Math.ceil(Math.sqrt((colors * height) / width));
  let sy: number;
  if (Math.floor((py * width) / height) * py < colors) {
    sy = width / Math.ceil((width * py) / height); // does not fit
  } else {
    sy = height / py;
  }
  return Math.max(sx, sy);
}

export default Palette;
