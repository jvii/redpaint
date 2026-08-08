import { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { colorToRGBString } from '../../algorithm/color';
import { useGadgetHint } from '../toolbox/useGadgetHint';
import { colorIndicatorHint } from '../toolbox/toolboxHints';

export function ColorIndicator(): JSX.Element {
  const state = useAppState();
  const actions = useActions();
  const { hintRef, showHint, hideHint, hintPanel } = useGadgetHint(colorIndicatorHint);

  const background = {
    backgroundColor: colorToRGBString(useAppState().palette.displayBackgroundColor),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '25px',
    borderTop: '1px solid black',
    borderBottom: '1px solid black',
    paddingBottom: '1px',
    margin: 0,
  };
  const foreground = {
    backgroundColor: colorToRGBString(state.palette.displayForegroundColor),
    height: '20px',
    width: '20px',
    borderRadius: '50%',
  };

  return (
    <div
      ref={hintRef}
      className="color-indicator"
      onMouseOver={showHint}
      onMouseLeave={hideHint}
      onMouseDown={hideHint}
      onContextMenu={(event): void => {
        actions.paletteEditor.open();
        event.preventDefault();
      }}
    >
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
      {hintPanel}
    </div>
  );
}

export default ColorIndicator;
