import React from 'react';
import { useOvermind } from '../../overmind';
import { colorToRGBString } from '../../tools/util/util';
import './ColorIndicator.css';

export function ColorIndicator(): JSX.Element {
  const { state, actions } = useOvermind();

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
      <div
        style={background}
        onClick={(event): void => {
          actions.toolbox.toggleBackgroundColorSelectionMode();
          event.stopPropagation();
        }}
      >
        <div
          style={foreground}
          onClick={(event): void => {
            actions.toolbox.toggleForegroundColorSelectionMode();
            event.stopPropagation();
          }}
        ></div>
      </div>
    </div>
  );
}

export default ColorIndicator;
