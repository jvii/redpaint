import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { Dialog } from './Dialog';
import { CustomBrush } from '../../brush/CustomBrush';
import './Dialog.css';
import { Button } from '@mui/material';

export function DialogManager(): JSX.Element | null {

  switch (useAppState().dialog.activeDialog) {
    case 'PASTE_SELECT':
      // TODO: create components i.e. PasteDialog
      return (
        <Dialog header="Image from clipboard" prompt="Select how to use this image.">
          <button
            onClick={(): void => {
              //actions.brush.setBrush(new CustomBrush(state.app.pasteBufferImageObjectURL));
              useActions().brush.setMode('Matte');
              useActions().dialog.close();
            }}
          >
            Paste as brush
          </button>
          <button
            onClick={(): void => {
              useActions().canvas.setLoadedImage(useAppState().app.pasteBufferImageObjectURL);
              useActions().dialog.close();
            }}
          >
            Paste as new image
          </button>
        </Dialog>
      );

    case 'PASTE_ERROR':
      return (
        <Dialog header="Image from clipboard" prompt="Clipboard item not recognized as an image.">
          <Button variant="contained" color="primary" onClick={useActions().dialog.close}>
            OK
          </Button>
        </Dialog>
      );

    default:
      return null;
  }
}
