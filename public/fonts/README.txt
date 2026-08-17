Fonts served from this directory
===============================

Everything here is a separate file the app fetches at runtime, never bundled
into the built JavaScript. That is deliberate. A face whose licence is not
permissive (the Amiga conversions are GPL with the font exception) can sit
beside a public-domain one only as long as neither ends up inside the same
compiled artifact: the font exception covers the pictures a user paints with a
font, not an application that compiles the font into itself. Keeping every face
a fetched asset is what keeps that distinction available.


press-start-2p-latin.woff2, press-start-2p-latin-ext.woff2
----------------------------------------------------------
The UI face, declared in index.html. SIL Open Font License 1.1 — see OFL.txt,
which the licence requires travel with the font.


unscii-8.rpbf
-------------
The text tool's bundled bitmap face: 8x8, printable ASCII, baseline 7.

  UNSCII by Viznut — http://viznut.fi/unscii/
  https://github.com/viznut/unscii

  "You can consider it Public Domain (or CC-0) except for the files derived
   from or containing parts of Roman Czyborra's Unifont project
   (unifont.hex, hex2bdf.pl, unscii-16-full.*) which fall under GPL."

Built from unscii-8.hex, which is not one of the GPL files above and is
vendored at tools/fonts/unscii-8.hex. Regenerate with:

  node tools/buildBitmapFont.mjs tools/fonts/unscii-8.hex public/fonts/unscii-8.rpbf

The .rpbf container is this project's own; the format is documented at the top
of tools/buildBitmapFont.mjs and parsed by src/domain/BitmapFont.ts.

unscii exists because outline fonts have nothing to give below about 12px: at
that size their stems are narrower than a pixel and canvas grid-fits nothing,
so no amount of supersampling recovers them (see src/algorithm/glyphRaster.ts).
A face drawn as pixels in the first place has no such problem.
