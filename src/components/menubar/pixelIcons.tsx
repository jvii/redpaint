import { JSX } from 'react';

// Pixel icons for the menu gadgets (docs/brush-transforms.md Phase E /
// the menu redesign), drawn as ASCII maps rendered to crispEdges SVG rects.
// Transform glyphs use only 'X' (currentColor) so they inherit gadget text
// color on hover/disable; the floppy and brush are fixed-color identity
// icons in the Workbench 1.3 palette.
const PALETTE: Record<string, string> = {
  K: '#0a0a28', // floppy body navy
  O: '#ff8800', // Workbench orange
  W: '#ffffff',
  B: 'rgb(0, 85, 170)', // Workbench blue
};

function parse(map: string): string[] {
  return map
    .trim()
    .split('\n')
    .map((row) => row.trim());
}

function transpose(map: string): string {
  const rows = parse(map);
  return rows[0]
    .split('')
    .map((_, x) => rows.map((row) => row[x]).join(''))
    .join('\n');
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

  brush: `
    .........KK..
    ........KWWK.
    .......KWWK..
    ......KWWK...
    .....KWWK....
    ....KOOK.....
    ...KOOK......
    ..KOOK.......
    .KOOK........
    .KKK.........
    .............
  `,

  flipH: `
    .....XX.....
    .X...XX...X.
    XX...XX...XX
    XXX..XX..XXX
    XX...XX...XX
    .X...XX...X.
    .....XX.....
  `,
  get flipV(): string {
    return transpose(this.flipH);
  },

  rot90: `
    .XXXXXXXX...
    .X......X...
    .X......X...
    .X.....XXX..
    .X......X...
    .X..........
    .X..........
    .XXXXX......
  `,
  rotAny: `
    ..XXXXXX....
    .X......X...
    X........X..
    X........X..
    X...X....X..
    .X..XX...X..
    ..XXXX......
    ....X.......
  `,
  halve: `
    XXXXXXXXXX..
    X........X..
    X........X..
    X..XXXX..X..
    X..XXXX..X..
    X........X..
    X........X..
    XXXXXXXXXX..
  `,
  double: `
    XXXXX.......
    XXXXX.......
    XXXXX..XX...
    XXXXX...XX..
    .........XXX
    ........XXXX
    ......XXXXXX
    ............
  `,
  // the toolbar's existing stretch glyph, four corner arrows
  stretch: `
    XXX......XXX
    XX........XX
    X.X......X.X
    ...X....X...
    ............
    ...X....X...
    X.X......X.X
    XX........XX
    XXX......XXX
  `,
  shear: `
    ...XXXXXXXX.
    ...XXXXXXXX.
    ..XXXXXXXX..
    .XXXXXXXX...
    .XXXXXXXX...
    XXXXXXXX....
  `,
  bendH: `
    .XX.........
    ..XX........
    ...XX.......
    ...XX.......
    ...XX.......
    ..XX........
    .XX.........
  `,
  get bendV(): string {
    return transpose(this.bendH);
  },
  restore: `
    ..X.........
    .XX.........
    XXXXXXXX....
    .XX.....X...
    ..X......X..
    .........X..
    .........X..
    ......XXX...
  `,
};
