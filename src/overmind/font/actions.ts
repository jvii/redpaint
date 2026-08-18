import { Context } from '../../overmind';
import { availableFontFamilies } from '../../domain/systemFonts';
import { bundledOutlineFace, loadBundledFaces } from '../../domain/BundledFonts';
import { constrainSize, sizeRangeFor } from './state';

export const setFamily = (context: Context, family: string): void => {
  context.state.font.family = family;
  // A bundled face steps by its own grid and a system face has a floor, so a
  // size carried over from another family is often not one this one offers.
  context.state.font.size = constrainSize(
    context.state.font.size,
    sizeRangeFor(bundledOutlineFace(family)?.gridSize)
  );
};

export const setSize = (context: Context, size: number): void => {
  context.state.font.size = constrainSize(
    size,
    sizeRangeFor(bundledOutlineFace(context.state.font.family)?.gridSize)
  );
};

export const setBold = (context: Context, bold: boolean): void => {
  context.state.font.bold = bold;
};

export const setItalic = (context: Context, italic: boolean): void => {
  context.state.font.italic = italic;
};

export const setUnderline = (context: Context, underline: boolean): void => {
  context.state.font.underline = underline;
};

// Loads the family list once, on the first open. Where enumeration is
// available this is what prompts for permission, so it is deliberately tied to
// someone actually asking for the requester.
export const loadFamilies = async (context: Context): Promise<void> => {
  if (context.state.font.familiesLoaded) {
    return;
  }
  // The bundled faces are what the requester lists first, so they are awaited
  // alongside the system list rather than after it.
  const [{ families, source }] = await Promise.all([availableFontFamilies(), loadBundledFaces()]);
  context.state.font.families = families;
  context.state.font.familiesSource = source;
  context.state.font.familiesLoaded = true;
  // The configured family may not be among them (a probe that missed it, or a
  // machine without it). Falling back to the first found keeps the list and the
  // selection agreeing, so the preview always shows what is highlighted.
  //
  // A bundled face is never in this list — nothing installed it — so it has to
  // be excused, or the first open of the requester would quietly replace the
  // default with whatever the machine happens to list first.
  const family = context.state.font.family;
  if (families.length > 0 && !families.includes(family) && !bundledOutlineFace(family)) {
    context.state.font.family = families[0];
  }
};

export const openSettings = (context: Context): void => {
  const { family, size, bold, italic, underline } = context.state.font;
  const filled = context.state.toolbox.selectedDrawingToolId === 'textFilled';
  context.state.font.settingsSnapshot = { family, size, bold, italic, underline, filled };
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
    context.state.font.family = snapshot.family;
    context.state.font.size = snapshot.size;
    context.state.font.bold = snapshot.bold;
    context.state.font.italic = snapshot.italic;
    context.state.font.underline = snapshot.underline;
    context.actions.toolbox.setSelectedDrawingTool(snapshot.filled ? 'textFilled' : 'textNoFill');
  }
  context.actions.font.closeSettings();
};
