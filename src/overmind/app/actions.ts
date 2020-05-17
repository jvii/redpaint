import { Action } from 'overmind';

export const imageFileToPasteBuffer: Action<File> = ({ state }, imageFile): void => {
  state.app.pasteBufferImageObjectURL = URL.createObjectURL(imageFile);
};
