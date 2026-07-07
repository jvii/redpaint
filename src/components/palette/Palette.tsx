import React, { JSX } from 'react';
import { ColorButton, MARK_WIDTH } from './ColorButton';
import { useActions, useAppState } from '../../overmind';
import './Palette.css';

type Props = {
  // Overrides for embedding the grid somewhere that isn't about painting
  // colors (e.g. the palette editor): clicking a swatch calls onSelectColor
  // instead of setting the FG/BG paint color, and isSelected is driven by
  // selectedColorId instead of the foreground color.
  selectedColorId?: string;
  onSelectColor?: (colorId: string) => void;
  // The currently active color-cycling/gradient range (palette editor only):
  // draws DPaint's bracket marker over its member swatches.
  activeRange?: { start: string; end: string } | null;
  // Toolbox usage: stretch to fill the sidebar's remaining height, rows
  // sized to divide that height evenly (not necessarily square). Omitted in
  // the palette editor, where cells stay square and sized off the width.
  fillHeight?: boolean;
  // Palette editor only: a persistent black rule between each of the 4
  // columns, like DPaint's requester (the toolbox palette stays undivided).
  // The rules are simply the grid's column gaps with the black container
  // background showing through — neutral space no swatch owns, which is
  // what lets the range/selection marks replace them by just painting there.
  columnDividers?: boolean;
};

// Column count per palette depth. DPaint laid its 32-color palette out as 4
// columns of 8; we keep 4 columns up to 64 (so 64 is 4x16, wide swatches),
// then widen to 8 for the deep palettes — Personal Paint style (256 = 8x32).
// The same grid renders in the toolbox and the palette editor so a swatch's
// position never shifts between the two.
function columnCountFor(colorCount: number): number {
  if (colorCount <= 8) return 1;
  if (colorCount <= 16) return 2;
  if (colorCount <= 64) return 4;
  return 8;
}

function Palette({
  selectedColorId,
  onSelectColor,
  activeRange,
  fillHeight,
  columnDividers,
}: Props = {}): JSX.Element {
  const state = useAppState()
  const actions = useActions()

  const colorCount = state.palette.paletteArray.length;
  const columns = columnCountFor(colorCount);
  const rows = Math.ceil(colorCount / columns);

  const isSelected = (id: string): boolean =>
    onSelectColor
      ? id === selectedColorId
      // no slot is highlighted while an RGB foreground (picked from a
      // true-color pixel) is active
      : !state.palette.foregroundRgb && id === state.palette.foregroundColorId;

  const createColorButton = (index: number): JSX.Element => {
    const colorId = index.toString();
    const isRangeMember =
      !!activeRange && index >= Number(activeRange.start) && index <= Number(activeRange.end);
    return (
      <ColorButton
        colorId={colorId}
        isSelected={isSelected(colorId)}
        onClick={(): void =>
          onSelectColor ? onSelectColor(colorId) : actions.palette.setForegroundColor(colorId)
        }
        onRightClick={(): void =>
          onSelectColor ? onSelectColor(colorId) : actions.palette.setBackgroundColor(colorId)
        }
        isRangeMember={isRangeMember}
        isRangeStart={isRangeMember && colorId === activeRange?.start}
        isRangeEnd={isRangeMember && colorId === activeRange?.end}
        fillCell={fillHeight}
        key={index}
      />
    );
  };

  // grid-auto-flow: column fills swatches down each column before wrapping,
  // matching DPaint's numbering (ids 1..rows are column 1, and so on)
  const gridStyle = {
    gridAutoFlow: 'column',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, ${fillHeight ? '1fr' : 'auto'})`,
    columnGap: columnDividers ? MARK_WIDTH : 0,
    '--mark-width': `${MARK_WIDTH}px`,
  } as React.CSSProperties;

  return (
    <div className={'palette' + (fillHeight ? ' palette--fill' : '')} style={gridStyle}>
      {state.palette.paletteArray.map((color, index): JSX.Element => createColorButton(index + 1))}
    </div>
  );
}

export default Palette;
