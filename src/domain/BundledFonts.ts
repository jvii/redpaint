// The faces redpaint ships, served from public/fonts. Registered here rather
// than discovered, so the list the requester shows is the list that exists.
//
// All of them are drawn on a pixel grid, which is the whole reason to carry a
// font at all: a pixel-gridded face is nothing but axis-aligned rectangles, and
// the coverage threshold in glyphRaster.ts only ever struggles with curves and
// diagonals. So they come out of the ordinary outline path clean, with no
// bitmap conversion and no special case anywhere downstream.
//
// The family name is what reaches ctx.font, so it is also the id.
//
// gridSize is the face's own pixel grid, and only sizes that are whole
// multiples of it are offered (overmind/font/state.ts): between them the glyphs
// land off the grid they were drawn on and the face stops being crisp.
//
// `url` is absent for a face index.html already declares. Registering a second
// FontFace for a family the document provides does not replace those — it adds
// one *more*, and one with no unicode-range, so it competes for every character
// against the subset faces the stylesheet split the family into. The app's own
// chrome is set in Press Start 2P, so that arrives as a late reflow of the very
// modal doing the loading, which is what index.html's font-display: block and
// preload were chosen to avoid.
export type BundledOutlineFace = { family: string; url?: string; gridSize: number };

export const BUNDLED_OUTLINE_FACES: BundledOutlineFace[] = [
  // No url: index.html declares this one for the UI, so ctx.font already
  // reaches it and there is nothing left to load.
  { family: 'Press Start 2P', gridSize: 8 },
  // Its lowercase is drawn as small caps; that is the face, not a fault.
  { family: 'Silkscreen', url: '/fonts/silkscreen.woff2', gridSize: 8 },
];

export function bundledOutlineFace(family: string): BundledOutlineFace | undefined {
  return BUNDLED_OUTLINE_FACES.find((face): boolean => face.family === family);
}

// Fetched rather than imported: a bundled module would be inlined into the
// built JavaScript, and keeping faces as separate assets is what lets a
// GPL-licensed one (the Amiga conversions) sit beside a permissively licensed
// one without the two meeting inside a build artifact. See
// public/fonts/README.txt.
export async function loadBundledFaces(): Promise<void> {
  await Promise.all(
    BUNDLED_OUTLINE_FACES.filter((face): boolean => face.url !== undefined).map(
      async (face): Promise<void> => registerOutlineFace(face.family, face.url as string)
    )
  );
}

// Registers a face by its bytes, which is all it takes for ctx.font to reach it
// afterwards — no parsing of the font file at any point. The same call is what
// a font the user supplies would go through, since a dropped File gives the
// identical ArrayBuffer.
export async function registerOutlineFace(
  family: string,
  source: string | ArrayBuffer
): Promise<void> {
  // Tracked here rather than asked of document.fonts. FontFaceSet.check()
  // answers "would this render without waiting", and for a family nothing has
  // registered that is *true* — there is nothing to load, so a system fallback
  // is ready immediately. Used as a guard it skips every load and leaves every
  // bundled face silently substituted by the fallback.
  if (registeredOutlineFaces.has(family)) {
    return;
  }
  registeredOutlineFaces.add(family);
  const bytes = typeof source === 'string' ? await (await fetch(source)).arrayBuffer() : source;
  const face = new FontFace(family, bytes);
  await face.load();
  document.fonts.add(face);
}

const registeredOutlineFaces = new Set<string>();
