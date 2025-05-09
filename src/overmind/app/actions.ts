import { Context } from '../../overmind';

export const imageFileToPasteBuffer = (context: Context, imageFile: File): void => {
  context.state.app.pasteBufferImageObjectURL = URL.createObjectURL(imageFile);
};

export const setLoading = (context: Context, isLoading: boolean): void => {
  context.state.app.isLoading = isLoading;
};
