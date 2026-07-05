import { JSX } from 'react';
import './PaletteEditor.css';
import { useActions, useAppState } from '../../overmind';
import { Color } from '../../types';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import Palette from '../palette/Palette';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroSlider } from '../ui/RetroSlider';

export function PaletteEditor(): JSX.Element | null {
  const state = useAppState();
  const actions = useActions();

  if (!state.paletteEditor.isOpen) {
    return null;
  }

  // The editor edits the selected palette slot directly; it is not concerned
  // with the active painting color (which may be a free RGB override).
  const editedColor = state.palette.palette[state.palette.foregroundColorId];

  function setR(value: number) {
    const newColor: Color = { r: value, g: editedColor.g, b: editedColor.b };
    setColor(newColor);
  }

  function setG(value: number) {
    const newColor: Color = { r: editedColor.r, g: value, b: editedColor.b };
    setColor(newColor);
  }

  function setB(value: number) {
    const newColor: Color = { r: editedColor.r, g: editedColor.g, b: value };
    setColor(newColor);
  }

  function setColor(newColor: Color) {
    actions.palette.editColor({ colorId: state.palette.foregroundColorId, newColor: newColor });
    paintingCanvasController.updatePalette();
    overlayCanvasController.updatePalette();
  }

  return (
    <Modal header="Color palette">
      <div className="palette-editor__container">
        <div className="palette-editor__sliders">
          <div className="palette-editor__slider">
            <RetroSlider
              vertical
              value={editedColor.r}
              min={0}
              max={255}
              onChange={setR}
            />
            <span className="palette-editor__slider-label">R</span>
          </div>
          <div className="palette-editor__slider">
            <RetroSlider
              vertical
              value={editedColor.g}
              min={0}
              max={255}
              onChange={setG}
            />
            <span className="palette-editor__slider-label">G</span>
          </div>
          <div className="palette-editor__slider">
            <RetroSlider
              vertical
              value={editedColor.b}
              min={0}
              max={255}
              onChange={setB}
            />
            <span className="palette-editor__slider-label">B</span>
          </div>
        </div>
        <div className="palette-editor__palette-container">
          <Palette></Palette>
        </div>
      </div>
      <hr className="retro-divider" />
      <RetroButton variant="secondary" onClick={actions.paletteEditor.close}>
        Cancel
      </RetroButton>
      <RetroButton variant="primary" onClick={actions.paletteEditor.close}>
        OK
      </RetroButton>
    </Modal>
  );
}
