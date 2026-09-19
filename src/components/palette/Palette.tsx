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
  // The Stencil requester's locked colors: each gets a half circle in the
  // gutter beside its swatch (Palette.css), which asking for this turns on.
  lockedColorIds?: readonly string[];
  // The currently active color-cycling/gradient range (palette editor only):
  // draws DPaint's bracket marker over its member swatches.
  activeRange?: { start: string; end: string } | null;
  // Take the frame and the stretch that go with filling a box the caller sized
  // (Palette.css). Every grid does divide its box - the rows are 1fr either way
  // - so this only picks the styling.
  fillHeight?: boolean;
  // Palette editor only: a persistent black rule between each of the 4 columns,
  // like DPaint's requester (the toolbox palette stays undivided). The rules
  // are simply the grid's column gaps with the black container background
  // showing through. Neutral space no swatch owns, which is what lets the
  // range/selection marks replace them by just painting there.
  columnDividers?: boolean;
};

// Column count per palette depth. DPaint laid its 32-color palette out as 4
// columns of 8; we keep 4 columns up to 64 (so 64 is 4x16, wide swatches), then
// widen to 8 for the deep palettes: Personal Paint style (256 = 8x32). The same
// grid renders in the toolbox and the palette editor so a swatch's position
// never shifts between the two.
export function paletteRowCount(colorCount: number): number {
  return Math.ceil(colorCount / paletteColumnCount(colorCount));
}

export function paletteColumnCount(colorCount: number): number {
  if (colorCount <= 8) return 1;
  if (colorCount <= 16) return 2;
  if (colorCount <= 64) return 4;
  return 8;
}

function Palette({
  selectedColorId,
  onSelectColor,
  lockedColorIds,
  activeRange,
  fillHeight,
  columnDividers,
}: Props = {}): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  const colorCount = state.palette.paletteArray.length;
  const columns = paletteColumnCount(colorCount);
  const rows = Math.ceil(colorCount / columns);
  // The marks are drawn at the swatch's edge, so a deep palette's rows - which
  // divide a box the caller fixes - cannot afford the full 3px: past 8 rows a
  // row is under 20px, and a ring on both sides of it leaves a sliver of color
  // between them while painting over the neighbors.
  const markWidth = rows > 8 ? 2 : MARK_WIDTH;

  // Which requester currently owns this grid's clicks, replacing or narrowing
  // its ordinary job for as long as it is open (docs/stencil.md). Only the
  // toolbox copy is ever borrowed: the copy inside a requester passes its own
  // onSelectColor. They stay reachable by different means - Fill Style lifts
  // this grid over its own click-catcher (.palette--above-modal), the other two
  // let the canvas through and make the rest of the chrome inert instead.
  const borrowedBy: 'stencil' | 'paletteEditor' | 'fillStyle' | null = onSelectColor
    ? null
    : state.stencil.requesterOpen
      ? 'stencil'
      : state.paletteEditor.isOpen
        ? 'paletteEditor'
        : state.fillStyle.settingsOpen
          ? 'fillStyle'
          : null;

  const select = (colorId: string): void => {
    switch (borrowedBy) {
      case 'stencil':
        actions.stencil.toggleColor(Number(colorId));
        break;
      case 'paletteEditor':
        actions.paletteEditor.selectEditedColor(colorId);
        break;
      // Fill Style picks its gradient off the foreground color, which is this
      // grid's ordinary job: borrowing it only takes the background pick away.
      default:
        actions.palette.setForegroundColor(colorId);
    }
  };

  const isSelected = (id: string): boolean =>
    onSelectColor
      ? id === selectedColorId
      : borrowedBy === 'paletteEditor'
        ? id === state.paletteEditor.editedColorId
        : // no slot is highlighted while an RGB foreground (picked from a
          // true-color pixel) is active
          !state.palette.foregroundRgb && id === state.palette.foregroundColorId;

  const createColorButton = (index: number): JSX.Element => {
    const colorId = index.toString();
    const isRangeMember =
      !!activeRange && index >= Number(activeRange.start) && index <= Number(activeRange.end);
    return (
      <ColorButton
        colorId={colorId}
        isSelected={isSelected(colorId)}
        onClick={(): void => (onSelectColor ? onSelectColor(colorId) : select(colorId))}
        onRightClick={(): void => {
          // The background pick, and only where this grid is doing its own job:
          // a requester's grid, or one borrowed by a requester, is not choosing
          // paint colors, and right click does nothing there.
          if (!onSelectColor && !borrowedBy) {
            actions.palette.setBackgroundColor(colorId);
          }
        }}
        isRangeMember={isRangeMember}
        isRangeStart={isRangeMember && colorId === activeRange?.start}
        isRangeEnd={isRangeMember && colorId === activeRange?.end}
        isLocked={lockedColorIds?.includes(colorId) ?? false}
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
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    columnGap: columnDividers ? markWidth : 0,
    '--mark-width': `${markWidth}px`,
  } as React.CSSProperties;

  return (
    <div
      className={
        'palette' +
        (fillHeight ? ' palette--fill' : '') +
        // Lifts this grid's own stacking context (already isolated, see
        // Palette.css) above the Fill Style modal's full-page click-catcher:
        // the one exception to that dialog blocking the whole app, rather than
        // punching a hole in the catcher itself and re-blocking every other
        // surface (canvas, menubar, toolbox, ...) by hand.
        (borrowedBy === 'fillStyle' ? ' palette--above-modal' : '') +
        // the lock marks need their gutter (Palette.css); only the requester
        // that shows them asks for it
        (lockedColorIds ? ' palette--lock-gutters' : '')
      }
      style={gridStyle}
    >
      {state.palette.paletteArray.map((color, index): JSX.Element => createColorButton(index + 1))}
    </div>
  );
}

export default Palette;
