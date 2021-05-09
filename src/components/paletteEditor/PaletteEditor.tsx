import React, { useRef } from 'react';
import { Button, Divider, Slider, Typography } from '@material-ui/core';
import './PaletteEditor.css';
import { useOvermind } from '../../overmind';
import { Color } from '../../types';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import Palette from '../palette/Palette';

export function PaletteEditor(): JSX.Element | null {
  const { state, actions } = useOvermind();

  const overlayRef = useRef<HTMLDivElement>(document.createElement('div'));

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
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();
  }

  function setG(value: number) {
    const newColor: Color = {
      r: state.palette.foregroundColor.r,
      g: value,
      b: state.palette.foregroundColor.b,
    };
    actions.palette.editColor({ colorId: state.palette.foregroundColorId, newColor: newColor });
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();
  }

  function setB(value: number) {
    const newColor: Color = {
      r: state.palette.foregroundColor.r,
      g: state.palette.foregroundColor.g,
      b: value,
    };
    actions.palette.editColor({ colorId: state.palette.foregroundColorId, newColor: newColor });
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();
  }

  const colorMarks = [
    {
      value: 0,
      label: '0',
    },
    {
      value: 255,
      label: '255',
    },
  ];

  return (
    <>
      <div className="modal-overlay-invisible" ref={overlayRef}>
        <div className="palette-editor-modal">
          <div className="modal-header">
            <p>Color Palette</p>
          </div>
          <Divider variant="middle" />
          <div className="palette-editor-elements">
            <div className="sliders">
              <Slider
                defaultValue={state.palette.foregroundColor.r}
                step={1}
                min={0}
                max={255}
                valueLabelDisplay="auto"
                orientation="vertical"
                onChange={(event, value) => setR(Number(value))}
              />
              <Slider
                defaultValue={state.palette.foregroundColor.g}
                step={1}
                min={0}
                max={255}
                valueLabelDisplay="auto"
                orientation="vertical"
                onChange={(event, value) => setG(Number(value))}
              />
              <Slider
                defaultValue={state.palette.foregroundColor.b}
                step={1}
                min={0}
                max={255}
                valueLabelDisplay="auto"
                orientation="vertical"
                onChange={(event, value) => setB(Number(value))}
              />
            </div>
            <div className="palette-container">
              <Palette></Palette>
            </div>
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
