import { JSX } from 'react';
import { ColorButton } from './ColorButton';
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
  columnDividers?: boolean;
};

// DPaint always laid its 32-color palette out as 4 columns of 8 — the same
// grid renders here and in the palette editor, so a swatch's position never
// shifts between the two.
const COLUMNS = 4;

function Palette({
  selectedColorId,
  onSelectColor,
  activeRange,
  fillHeight,
  columnDividers,
}: Props = {}): JSX.Element {
  const state = useAppState()
  const actions = useActions()

  const rows = Math.ceil(state.palette.paletteArray.length / COLUMNS);

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
    // grid-auto-flow is column, so ids run down a column before wrapping —
    // column 0 is ids 1..rows, column 1 is rows+1..2*rows, and so on.
    const column = Math.floor((index - 1) / rows);
    // This swatch's divider/range mark belongs to its own left edge, at the
    // same seam its left neighbor's selection ring would expand into —
    // relying on paint order (z-index) to sort out who wins there isn't
    // reliable, so suppress it outright whenever that neighbor is selected.
    const leftNeighborIndex = index - rows;
    const leftNeighborSelected =
      leftNeighborIndex >= 1 && isSelected(leftNeighborIndex.toString());
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
        showColumnDivider={!!columnDividers && column > 0 && !leftNeighborSelected}
        columnDividersEnabled={!!columnDividers}
        isLastColumn={column === COLUMNS - 1}
        key={index}
      />
    );
  };

  return (
    <div
      className={'palette' + (fillHeight ? ' palette--fill' : '')}
      style={{
        gridAutoFlow: 'column',
        gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, ${fillHeight ? '1fr' : 'auto'})`,
      }}
    >
      {state.palette.paletteArray.map((color, index): JSX.Element => createColorButton(index + 1))}
    </div>
  );
}

export default Palette;
