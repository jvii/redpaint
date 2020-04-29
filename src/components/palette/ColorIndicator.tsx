import React from 'react';
import { useOvermind } from '../../overmind';
import { colorToRGBString } from '../../tools/util/util';

export function ColorIndicator(): JSX.Element {
  const { state, actions } = useOvermind();

  const background = {
    backgroundColor: colorToRGBString(state.palette.backgroundColor),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '70px',
    height: '25px',
    borderTop: '1px solid black',
    borderBottom: '1px solid black',
    paddingBottom: '1px',
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
