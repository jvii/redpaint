import React from 'react';
import { useOvermind } from '../../overmind';
import { Dialog } from './Dialog';
import { CustomBrush } from '../../brush/CustomBrush';
import './Dialog.css';
import { Button } from '@material-ui/core';

export function DialogManager(): JSX.Element | null {
  const { state, actions } = useOvermind();

  switch (state.dialog.activeDialog) {
    case 'PASTE_SELECT':
      // TODO: create components i.e. PasteDialog
      return (
        <Dialog header="Image from clipboard" prompt="Select how to use this image.">
          <button
            onClick={(): void => {
              //actions.brush.setBrush(new CustomBrush(state.app.pasteBufferImageObjectURL));
              actions.brush.setMode('Matte');
              actions.dialog.close();
            }}
          >
            Paste as brush
          </button>
          <button
            onClick={(): void => {
              actions.canvas.setLoadedImage(state.app.pasteBufferImageObjectURL);
              actions.dialog.close();
            }}
          >
            Paste as new image
          </button>
        </Dialog>
      );

    case 'PASTE_ERROR':
      return (
        <Dialog header="Image from clipboard" prompt="Clipboard item not recognized as an image.">
          <Button variant="contained" color="primary" onClick={actions.dialog.close}>
            OK
          </Button>
        </Dialog>
      );

    default:
      return null;
  }
}
