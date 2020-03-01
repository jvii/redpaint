import React from 'react';
import { useOvermind } from '../../overmind';
import { colorToRGBString } from '../../tools/util';
import './ColorIndicator.css';

export function ColorIndicator(): JSX.Element {
  const { state } = useOvermind();

  const background = {
    backgroundColor: colorToRGBString(state.palette.backgroundColor),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gridArea: 'colorIndicator',
    width: '70px',
    height: '25px',
    borderWidth: '0px',
    padding: 0,
    margin: 0,
  };
  const foreground = {
    backgroundColor: colorToRGBString(state.palette.foregroundColor),
    height: '20px',
    width: '20px',
    borderRadius: '50%',
  };

  return (
    <div className="color-indicator">
      <div style={background}>
        <div style={foreground}></div>
      </div>
    </div>
  );
}

export default ColorIndicator;
