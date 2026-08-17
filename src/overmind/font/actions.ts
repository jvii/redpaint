import { Context } from '../../overmind';
import { availableFontFamilies } from '../../domain/systemFonts';
import { loadBundledFaces } from '../../domain/BitmapFont';

// Picking a system family also leaves any bundled bitmap face: the two are
// alternatives, and a list that highlighted one of each would be lying about
// what the tool is about to paint.
export const setFamily = (context: Context, family: string): void => {
  context.state.font.family = family;
  context.state.font.faceId = null;
};

export const setBundledFace = (context: Context, faceId: string): void => {
  context.state.font.faceId = faceId;
};

export const setScale = (context: Context, scale: number): void => {
  context.state.font.scale = scale;
};

export const setSize = (context: Context, size: number): void => {
  context.state.font.size = size;
};

export const setBold = (context: Context, bold: boolean): void => {
  context.state.font.bold = bold;
};

export const setItalic = (context: Context, italic: boolean): void => {
  context.state.font.italic = italic;
};

// Loads the family list once, on the first open. Where enumeration is
// available this is what prompts for permission, so it is deliberately tied to
// someone actually asking for the requester.
export const loadFamilies = async (context: Context): Promise<void> => {
  if (context.state.font.familiesLoaded) {
    return;
  }
  // The bundled faces are a 772-byte fetch and are what the requester lists
  // first, so they are awaited alongside the system list rather than after it.
  const [{ families, source }] = await Promise.all([availableFontFamilies(), loadBundledFaces()]);
  context.state.font.families = families;
  context.state.font.familiesSource = source;
  context.state.font.familiesLoaded = true;
  // The configured family may not be among them (a probe that missed it, or a
  // machine without it). Falling back to the first found keeps the list and the
  // selection agreeing, so the preview always shows what is highlighted.
  if (families.length > 0 && !families.includes(context.state.font.family)) {
    context.state.font.family = families[0];
  }
};

export const openSettings = (context: Context): void => {
  const { faceId, scale, family, size, bold, italic } = context.state.font;
  context.state.font.settingsSnapshot = { faceId, scale, family, size, bold, italic };
  context.state.font.settingsOpen = true;
  context.actions.font.loadFamilies();
};

export const closeSettings = (context: Context): void => {
  context.state.font.settingsOpen = false;
  context.state.font.settingsSnapshot = null;
};

// Put back the values the panel was opened with, then close.
export const cancelSettings = (context: Context): void => {
  const snapshot = context.state.font.settingsSnapshot;
  if (snapshot) {
    context.state.font.faceId = snapshot.faceId;
    context.state.font.scale = snapshot.scale;
    context.state.font.family = snapshot.family;
    context.state.font.size = snapshot.size;
    context.state.font.bold = snapshot.bold;
    context.state.font.italic = snapshot.italic;
  }
  context.actions.font.closeSettings();
};
