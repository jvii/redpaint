import React, { useRef } from 'react';
import { Button, Slider } from '@material-ui/core';
import './PaletteEditor.css';
import { useOvermind } from '../../overmind';
import { Color } from '../../types';
import { CanvasState } from '../canvas/CanvasState';

interface Props {
  canvasState: CanvasState;
}

export function PaletteEditor({ canvasState }: Props): JSX.Element | null {
  const { state, actions } = useOvermind();

  const overlayRef = useRef<HTMLDivElement>(document.createElement('div'));

  const { mainCanvas } = canvasState;

  // eslint-disable-next-line no-constant-condition
  if (!state.paletteEditor.isOpen) {
    return null;
  }

  function setR(value: number) {
    const newColor: Color = {
      r: value,
      g: state.palette.foregroundColor.g,
      b: state.palette.foregroundColor.b,
    };
    actions.palette.editColor({ colorId: state.palette.foregroundColorId, newColor: newColor });
    const ctx = mainCanvas.getContext('2d');
    if (ctx) {
      //renderToCanvas(ctx);
    }
  }

  return (
    <>
      <div className="modal-overlay" ref={overlayRef}>
        <div className="palette-editor-modal">
          <div className="modal-header">
            <p>Palette Editor</p>
          </div>
          <div className="sliders">
            <Slider
              defaultValue={2}
              aria-labelledby="discrete-slider-small-steps"
              step={1}
              marks
              min={0}
              max={255}
              valueLabelDisplay="auto"
              orientation="vertical"
              onChange={(event, value) => setR(Number(value))}
            />
          </div>

          <Button variant="contained" color="primary" onClick={actions.paletteEditor.close}>
            OK
          </Button>
          <Button variant="contained" color="secondary" onClick={actions.paletteEditor.close}>
            Cancel
          </Button>
        </div>
      </div>
    </>
  );
}
