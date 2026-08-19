// The faces redpaint ships, served from public/fonts. See docs/text-tool.md.
//
// The family name is what reaches ctx.font, so it is also the id. gridSize is
// the face's own pixel grid; only whole multiples of it are offered as sizes
// (overmind/font/state.ts), since between them the face stops being crisp.
//
// `url` is absent for a face index.html already declares: registering a second
// FontFace for that family joins the subsets rather than replacing them, and
// relays out the chrome mid-session.
export type BundledOutlineFace = { family: string; url?: string; gridSize: number };

export const BUNDLED_OUTLINE_FACES: BundledOutlineFace[] = [
  // No url: index.html declares this one for the UI.
  { family: 'Press Start 2P', gridSize: 8 },
  // Its lowercase is drawn as small caps; that is the face, not a fault.
  { family: 'Silkscreen', url: '/fonts/silkscreen.woff2', gridSize: 8 },
];

export function bundledOutlineFace(family: string): BundledOutlineFace | undefined {
  return BUNDLED_OUTLINE_FACES.find((face): boolean => face.family === family);
}

// Fetched rather than imported: a bundled module would be inlined into the
// build, and licences must not meet there. See public/fonts/README.txt.
export async function loadBundledFaces(): Promise<void> {
  await Promise.all(
    BUNDLED_OUTLINE_FACES.filter((face): boolean => face.url !== undefined).map(
      async (face): Promise<void> => registerOutlineFace(face.family, face.url as string)
    )
  );
}

// Registers a face by its bytes — no parsing at any point. A user-supplied
// font would go through the same call.
export async function registerOutlineFace(
  family: string,
  source: string | ArrayBuffer
): Promise<void> {
  // Not document.fonts.check(): it answers "would this render without
  // waiting", which is true for a family nothing has registered.
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
