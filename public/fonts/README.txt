Fonts served from this directory
===============================

Everything here is a separate file the app fetches at runtime, never bundled
into the built JavaScript. That is deliberate. A face whose licence is not
permissive (the Amiga conversions are GPL with the font exception) can sit
beside a permissively licensed one only as long as neither ends up inside the
same compiled artifact: the font exception covers the pictures a user paints with a
font, not an application that compiles the font into itself. Keeping every face
a fetched asset is what keeps that distinction available.


press-start-2p-latin.woff2, press-start-2p-latin-ext.woff2
----------------------------------------------------------
The UI face, declared in index.html, and also offered to the text tool. SIL
Open Font License 1.1 — see OFL.txt, which the licence requires travel with the
font.

  Copyright 2012 The Press Start 2P Project Authors
  (https://github.com/google/fonts/tree/main/ofl/pressstart2p)


silkscreen.woff2
----------------
A pixel face offered to the text tool, latin subset from Google Fonts. SIL Open
Font License 1.1, the same OFL.txt; its copyright line, which the licence
requires be carried with it:

  Copyright 2001 The Silkscreen Project Authors
  (https://github.com/googlefonts/silkscreen)

Its lowercase is drawn as small caps. That is the face, not a fault.

Both this and Press Start 2P are loaded by their bytes through FontFace
(src/domain/BundledFonts.ts), not by an @font-face rule: the rasterizer has to
know when a face is ready before it measures anything, and a stylesheet gives
no such signal.

Neither needs bitmap conversion. A face drawn on a pixel grid is all
axis-aligned rectangles, and the coverage threshold in glyphRaster.ts only ever
struggles with curves and diagonals — so these come out of the ordinary outline
path clean, with no special case anywhere. Both are drawn on an 8px grid and
are offered only at whole multiples of it (BUNDLED_OUTLINE_FACES.gridSize):
in between the glyphs land off the grid they were drawn on and the face stops
being crisp, which is the only reason to bundle one.

VT323, Jersey 10 and Pixelify Sans were tried here and dropped. The first two
are drawn on grids large enough that they break up below roughly 15 and 20px,
and Pixelify Sans is pixel-*styled* rather than pixel-gridded — it has real
curves and behaves like any other outline face, which is not what this list is
for. The requester's preview is where that showed, which is why it renders
through the real rasterizer rather than as DOM text.
