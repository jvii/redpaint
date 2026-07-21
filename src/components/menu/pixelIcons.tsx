import { JSX } from 'react';

// Identity pixel icons for the menu gadgets (docs/style-guide.md): the
// disk and the paintbrush, drawn as ASCII maps rendered to crispEdges SVG
// rects in the Workbench 1.3 palette. Action glyphs (the transforms) are
// line drawings in transformIcons.tsx, not pixel art. 'X' renders in
// currentColor should a map ever need to follow the gadget text color.
const PALETTE: Record<string, string> = {
  K: '#0a0a28', // floppy body navy
  O: '#ff8800', // Workbench orange
  W: '#ffffff',
  B: 'rgb(0, 85, 170)', // Workbench blue
  U: '#0000ff', // brush handle blue
};

function parse(map: string): string[] {
  return map
    .trim()
    .split('\n')
    .map((row) => row.trim());
}

export function PixelIcon({ map, scale = 2 }: { map: string; scale?: number }): JSX.Element {
  const rows = parse(map);
  const height = rows.length;
  const width = rows[0].length;
  return (
    <svg
      className="pixel-icon"
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {rows.flatMap((row, y) =>
        row.split('').flatMap((char, x) => {
          if (char === '.') {
            return [];
          }
          const fill = char === 'X' ? 'currentColor' : PALETTE[char];
          return [<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />];
        })
      )}
    </svg>
  );
}

export const icons = {
  // The Workbench 1.3 disk: navy body with the chamfered top-right corner,
  // orange shutter with its dark window, the striped orange/blue Workbench
  // peak spilling from the shutter onto the white label, and the
  // write-protect notch at bottom-left.
  disk: `
    KKKKKKKKKKKKK...
    KKKKOOOOOOKKKK..
    KKKKOOOKKOKKKKK.
    KKKKOOOKKOKKKKKK
    KKKKOOOOOOKKKKKK
    KKKKKKKKKKKKKKKK
    KKKWWWWOBWWWWKKK
    KKKWWWOOBBWWWKKK
    KKKWWOOWWBBWWKKK
    KKKWOOWWWWBBWKKK
    KKKOOWWWWWWBBKKK
    KKKWWWWWWWWWWKKK
    KKKKKKKKKKKKKKKK
    KWWKKKKKKKKKKKKK
    KKKKKKKKKKKKKKKK
  `,

  // An exact copy of the hand-edited paintbrush pixel art: orange bristles,
  // a blue handle, outlined in navy.
  brush: `
    .............KKK
    ............KOOK
    ...........KOOK.
    ..........KOOK..
    .........KOOK...
    ........KOOK....
    .......KOOK.....
    ......KWKK......
    ...KKKKWWK......
    ..KKKKKKK.......
    .KUUKKKK........
    .KUUUKKK........
    .KUUUKKK........
    .KUUUUK.........
    KUUUKK..........
    KKKK............
  `,

  // The Deluxe Paint saved-picture icon: a framed desert-mountain landscape
  // (three peaks, snowcaps, a cloud band, scrubby orange foreground), traced
  // pixel-for-pixel from the original Workbench disk icon at its native
  // resolution (rather than up-scaled) so it stays crisp at the gadget's
  // scale=1 - the other maps here are small enough that scale=3 upscaling
  // doesn't show, this one is already full-size.
  image: `
    KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
    KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
    KggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggK
    KgWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWgK
    KgWggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggWgK
    KgWgKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKgWgK
    KgWgKKKKKKKKKKKKKKKKKKKKKggggggggggggggggggggggggggggggKKKKKKKgWgK
    KgWgKKBBBBBBBBBBBBBBBBBBWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWgBBBBKKgWgK
    KgWgKKBBBBBBBBBBBBBBBBBBgWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWgBBBBKKgWgK
    KgWgKKBBBBBBBBBBBBBggBBBBBBBBBBWWWWWWWWWWWWWWWWWBBBBBBBBBBBBKKgWgK
    KgWgKKBBBBBBBBBBBBBggBBBBBBBBBBWWWWWWWWWWWWWWWWgBBBBBBBBBBBBKKgWgK
    KgWgKKBBBBBBBBBBgKgWWgBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBKKgWgK
    KgWgKKBBBBBBBBBBWKgWWgBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBKKgWgK
    KgWgKKBBBBBBBBBBWgggWgBBBBBBBBBBBBgBBBBBBBBBBBBBBBgBBBBBBBBBKKgWgK
    KgWgKKBBBBBBBBBKWWKgWgBBBBBBBBBBBKggBBBBBBBBBBBBBBWBBBBBBBBBKKgWgK
    KgWgKKBBBBBBBBBKWWKgWWBBBBBBBBBBBKggBBBBBBBBBBBBBBWgBBBBBBBBKKgWgK
    KgWgKKBBBBBBBggKWWOgWWWWBBBBBBBBKWWWgBBBBBBBBBggKWWWWgBBBBBBKKgWgK
    KgWgKKBBBBBBBggKgWOgWWWWBBBBBBBBKgWWgBBBBBBBBBggKWWWWgBBBBBBKKgWgK
    KgWgKKBBBBBBBKKKKOWWWWWOOBBBBBBBKKgWWgBBBBBBKggKKWWWWWWgBBBBKKgWgK
    KgWgKKBBBBBBKKKKKOWWWWWOOBBBBBBBKKgWWgBBBBBBKggKKWWWWWWgBBBBKKgWgK
    KgWgKKBBBBBBKKKKKKKKKKgOOOBBBBBKKOOOOggBBKKgKgWggWWWWWWWggBBKKgWgK
    KgWgKKBBBBBKKKKKKKKKKKKOOOBBBBBKKOOOOOgBBKKgggWWWWWWWWWWWWBBKKgWgK
    KgWgKKBBBBKKKKKKKKKKKKKOOOgBBKKKKOOOOOggKKKgKKgggWgWWWWWWWggKKgWgK
    KgWgKKBBBKKKKKOOKOOKOOKOOOOBBKKKKOKOOOOgKKKKKKKKKWKgWWWWWWWWKKgWgK
    KgWgKKBBBKKKKKOOKOOKOOKOOOOgKKKKKOKOOOOgKKKKKKKKKgKgWWWWWWWWKKgWgK
    KgWgKKBKKKKOOKKKKOKKOOKOOOOOKKKKKKOOOOOKKKKKKKKOKOKOOOOWWWWWKKgWgK
    KgWgKKBKKKKOOKKKKOKKOOKOOOOOKKKKKKOOOOOKKKKKKKKOKOKOOOOWWWWWKKgWgK
    KgWgKKKKKKKOOKKOKOOOOOOOOOOKKKKOOOOOKKKOKKOKKKOOKKKOOOOOWWWWKKgWgK
    KgWgKKKKKKKOOKKOKOOOOOOOOOOKKKKOOOOOKKKOKKOKKKOOKKKOOOOOWWWWKKgWgK
    KgWgKKKKKKKKKKKOOOOOOOOOKOOKKOKKOOOKKKKKKKKKKKKKKOOOOOOOOOOOKKgWgK
    KgWgKKKKKOKKKOKOOOOOOOOOKOKKKOOKOOOKOOKKKOKKKKKKKOOOOOOOOOOOKKgWgK
    KgWgKKKKKKKKKOKOOOOOOOOOKKKKOOOKOOOKKKKKKOKKKKKKKOOOOOOOOOOOKKgWgK
    KgWgKKKKKKKKKOOOOKOOOOOOOKKOOOOKOOKKKKKOOOKOOKKOKOOKKOOOOOOOKKgWgK
    KgWgKKKKKKKKKOOOOKOOOOOOOKKOOOOKOOKKKKKOOOKOOOKOKOOKOOOOOOOOKKgWgK
    KgWgKKKKKKOKKOKOKOOOOOOOOOOOKKOOOKOKKKOKOKOKOOOKKOOOOOOOOOOOKKgWgK
    KgWgKKKKKKOKKOKOKOOOOOOOOOOOKKOOOKOKKKOKOKOKOOOKKOOOOOOOOOOOKKgWgK
    KgWgKKKKKOOOKKOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOKKgWgK
    KgWgKKKKKOOOKKOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOKKgWgK
    KgWgKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKgWgK
    KgWgKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKgWgK
    KgWggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggWgK
    KgWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWgK
    KgWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWgK
    KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
    KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
  `,
};
