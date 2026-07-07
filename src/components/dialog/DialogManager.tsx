import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { Dialog } from './Dialog';
import { CustomBrush } from '../../brush/CustomBrush';
import { brushHistory } from '../../brush/BrushHistory';
import './Dialog.css';
import { RetroButton } from '../ui/RetroButton';

export function DialogManager(): JSX.Element | null {
  const actions = useActions();
  const state = useAppState();

  const pasteAsBrush = (): void => {
    const url = state.app.pasteBufferImageObjectURL;
    actions.dialog.close();
    CustomBrush.fromImageUrl(url)
      .then((brush): void => {
        // same behavior as capturing a brush from the canvas
        brushHistory.set(brush);
        actions.brush.clearBuiltInBrushSelection();
        actions.brush.setMode('Matte');
        actions.toolbox.setSelectedDrawingTool('dottedFreehand');
      })
      .catch((): void => actions.dialog.open('PASTE_ERROR'))
      .finally((): void => URL.revokeObjectURL(url));
  };

  const pasteAsImage = (): void => {
    actions.canvas.setLoadedImage(state.app.pasteBufferImageObjectURL);
    actions.dialog.close();
  };

  const cancelPaste = (): void => {
    URL.revokeObjectURL(state.app.pasteBufferImageObjectURL);
    actions.dialog.close();
  };

  // The chosen screen is smaller than the current canvas, so fitting it would
  // lose pixels. Scale the canvas down to fit, crop it to the top-left, or keep
  // the canvas at its size (it just scrolls within the smaller screen).
  const resizeScreenScale = (): void => {
    const target = state.canvas.pendingScreenResize;
    if (target) {
      actions.canvas.resizeCanvasScalingContent(target);
    }
    actions.canvas.setPendingScreenResize(null);
    actions.dialog.close();
  };
  const resizeScreenCrop = (): void => {
    const target = state.canvas.pendingScreenResize;
    if (target) {
      actions.canvas.resizeCanvasPlacingContent(target);
    }
    actions.canvas.setPendingScreenResize(null);
    actions.dialog.close();
  };
  const resizeScreenKeep = (): void => {
    actions.canvas.setPendingScreenResize(null);
    actions.dialog.close();
  };

  switch (state.dialog.activeDialog) {
    case 'PASTE_SELECT':
      return (
        <Dialog header="Image from clipboard" prompt="Select how to use this image.">
          <RetroButton onClick={pasteAsBrush}>Paste as brush</RetroButton>
          <RetroButton onClick={pasteAsImage}>Paste as new image</RetroButton>
          <RetroButton variant="secondary" onClick={cancelPaste}>
            Cancel
          </RetroButton>
        </Dialog>
      );

    case 'PASTE_ERROR':
      return (
        <Dialog header="Image from clipboard" prompt="Clipboard item not recognized as an image.">
          <RetroButton variant="primary" onClick={actions.dialog.close}>
            OK
          </RetroButton>
        </Dialog>
      );

    case 'SCREEN_RESIZE':
      return (
        <Dialog
          header="Screen Format"
          prompt="The image is larger than the new screen. Resize it to fit, crop it, or keep the canvas at its current size?"
        >
          <RetroButton onClick={resizeScreenScale}>Resize</RetroButton>
          <RetroButton onClick={resizeScreenCrop}>Crop</RetroButton>
          <RetroButton variant="primary" onClick={resizeScreenKeep}>
            Keep original canvas size
          </RetroButton>
        </Dialog>
      );

    default:
      return null;
  }
}
