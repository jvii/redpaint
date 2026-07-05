export type State = {
  pasteBufferImageObjectURL: string;
  isLoading: boolean;
  menuOpen: boolean;
};

export const state: State = {
  pasteBufferImageObjectURL: '',
  isLoading: false,
  menuOpen: false,
};
