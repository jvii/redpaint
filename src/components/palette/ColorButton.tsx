import React, { JSX } from 'react';
import { useAppState } from '../../overmind';
import { colorToRGBString } from '../../tools/util/util';

// One shared thickness for the column divider (the grid's column gap, see
// Palette.tsx), the range bracket and the selection ring.
export const MARK_WIDTH = 3;

interface Props {
  colorId: string;
  isSelected: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onRightClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  // DPaint's Range bracket: every swatch in the active range gets a white
  // mark filling the column gap on its left, and the range's first/last
  // color additionally gets a short white cap across its top-left/
  // bottom-left — the "start" and "end" corners of the bracket.
  isRangeMember?: boolean;
  isRangeStart?: boolean;
  isRangeEnd?: boolean;
  // Toolbox usage: fill the (non-square) grid cell instead of staying a
  // fixed square sized off the width.
  fillCell?: boolean;
}

export function ColorButton({
  colorId,
  isSelected,
  onClick,
  onRightClick,
  isRangeMember = false,
  isRangeStart = false,
  isRangeEnd = false,
  fillCell = false,
}: Props): JSX.Element {
  // Marks are painted outside the swatch's own box, into space no sibling
  // owns: the column dividers are the grid's gaps (black container
  // background showing through), so the range mark just fills the gap on
  // its left, and the selection ring — a plain outline — lands exactly on
  // the divider gaps left/right while overlapping real neighbor color
  // where there is no gap (top/bottom, and everywhere in the gapless
  // toolbox palette). Layout rules in docs/palette-grid-marks.md.
  const buttonStyle: React.CSSProperties = {
    backgroundColor: colorToRGBString(useAppState().palette.displayPalette[colorId]),
  };
  if (isSelected) {
    buttonStyle.outline = `${MARK_WIDTH}px solid white`;
    buttonStyle.outlineOffset = 0;
    // paint above later DOM siblings (the below/right neighbors), which
    // would otherwise cover the ring where it overlaps them
    buttonStyle.zIndex = 2;
  } else if (isRangeMember) {
    // only the part of the shadow outside the swatch's own box is visible:
    // exactly the column gap to its left
    buttonStyle.boxShadow = `-${MARK_WIDTH}px 0 0 0 white`;
  }

  const handleRightClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    onRightClick(event);
    event.preventDefault();
  };

  return (
    <button
      className={'ColorButton' + (fillCell ? ' ColorButton--fill' : '')}
      onClick={onClick}
      onContextMenu={handleRightClick}
      style={buttonStyle}
    >
      {isRangeStart && <span className="ColorButton__range-start-cap"></span>}
      {isRangeEnd && <span className="ColorButton__range-end-cap"></span>}
    </button>
  );
}

export default ColorButton;
