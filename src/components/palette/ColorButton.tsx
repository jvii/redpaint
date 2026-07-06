import React, { JSX } from 'react';
import { useAppState } from '../../overmind';
import { colorToRGBString } from '../../tools/util/util';

// One shared thickness for the divider, the range bracket and the
// selection ring.
const MARK_WIDTH = 3;

interface Props {
  colorId: string;
  isSelected: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onRightClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  // DPaint's Range bracket: every swatch in the active range gets a white
  // left-edge mark, and the range's first/last color additionally gets a
  // short white cap across its top-left/bottom-left — the "start" and
  // "end" corners of the bracket.
  isRangeMember?: boolean;
  isRangeStart?: boolean;
  isRangeEnd?: boolean;
  // Toolbox usage: fill the (non-square) grid cell instead of staying a
  // fixed square sized off the width.
  fillCell?: boolean;
  // Palette editor only: a persistent black rule marking a column boundary
  // (DPaint's requester always showed these).
  showColumnDivider?: boolean;
  // Whether this Palette instance uses column dividers at all (the palette
  // editor does, the toolbox palette doesn't) and whether this swatch is in
  // the rightmost column — together these decide how the selection ring's
  // right side behaves (see below).
  columnDividersEnabled?: boolean;
  isLastColumn?: boolean;
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
  showColumnDivider = false,
  columnDividersEnabled = false,
  isLastColumn = false,
}: Props): JSX.Element {

  // Divider and range marks are painted outside the swatch's own box (never
  // shrinking its own color) via box-shadow, which only ever reaches left —
  // it's defined by the swatch to the right of a seam, and (since a box
  // never shows a shadow behind its own opaque background) it only becomes
  // visible inside the swatch to the LEFT of that seam. That makes the
  // seam's mark asymmetric: from a given swatch's own point of view, its
  // LEFT seam is genuinely outside it (in the neighbor), but its RIGHT seam
  // physically lives inside its OWN rightmost pixels. Selection has to
  // match that per side, or the two ends of the ring land in different
  // places relative to where the divider actually was:
  //  - left: reach outward into the neighbor (same as a plain divider).
  //  - right: when a divider convention exists there (not the last column,
  //    and this Palette uses dividers at all) stay inset, replacing exactly
  //    the neighbor's divider mark rather than also pushing past it into
  //    the neighbor's real color. Otherwise (toolbox palette, or the
  //    rightmost column) there's no divider to match, so it reaches
  //    outward like every other side.
  //  - top/bottom: always reach outward — there's no vertical divider
  //    concept to preserve.
  // All four marks are explicit positioned spans (not box-shadow, not
  // border) sharing one coordinate system, so their edges line up exactly
  // with no cross-mechanism rounding to worry about. box-shadow's reach is
  // confined to its own axis (two perpendicular shadows never actually
  // cover the diagonal corner between them), and mixing a real border with
  // positioned spans for adjacent marks was found to leave a hairline gap
  // on high-DPI displays even though the two "line up" on paper — each
  // mechanism can round sub-pixel offsets slightly differently. Spans are
  // told to extend past their own corners explicitly, and the inset right
  // mark stops exactly where the top/bottom marks start (touching, not
  // overlapping) rather than relying on paint order between them.
  const rightInset = isSelected && columnDividersEnabled && !isLastColumn;

  let buttonStyle: React.CSSProperties;
  if (isSelected) {
    buttonStyle = { border: 'none', zIndex: 2 };
  } else if (isRangeMember) {
    // no z-index here: column-major DOM order already paints this swatch
    // (later) over its left neighbor (earlier) without help, and an
    // explicit z-index would instead make this swatch's own background
    // win over its RIGHT neighbor's divider reaching in — hiding a mark
    // that has nothing to do with this swatch's own range membership.
    buttonStyle = { border: 'none', boxShadow: `-${MARK_WIDTH}px 0 0 0 white` };
  } else if (showColumnDivider) {
    buttonStyle = { border: 'none', boxShadow: `-${MARK_WIDTH}px 0 0 0 black` };
  } else {
    buttonStyle = { border: 'none' };
  }
  buttonStyle.backgroundColor = colorToRGBString(useAppState().palette.palette[colorId]);

  const handleRightClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    onRightClick(event);
    event.preventDefault();
  };

  const w = MARK_WIDTH;
  const markBase: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: 'white',
    pointerEvents: 'none',
  };
  // top/bottom always extend left by w to meet the left mark's corner. On
  // the right: when inset, they stop exactly flush with the box's own edge
  // (right: 0) — precisely where the inset right mark's top begins, so the
  // two touch without overlapping. Otherwise they extend past the edge by w
  // to meet the outward right mark's corner instead.
  const topBottomRight = rightInset ? 0 : -w;

  return (
    <button
      className={'ColorButton' + (fillCell ? ' ColorButton--fill' : '')}
      onClick={onClick}
      onContextMenu={handleRightClick}
      style={buttonStyle}
    >
      {isRangeStart && <span className="ColorButton__range-start-cap"></span>}
      {isRangeEnd && <span className="ColorButton__range-end-cap"></span>}
      {isSelected && (
        <>
          <span style={{ ...markBase, left: -w, width: w, top: -w, bottom: -w }}></span>
          <span style={{ ...markBase, top: -w, height: w, left: -w, right: topBottomRight }}></span>
          <span style={{ ...markBase, bottom: -w, height: w, left: -w, right: topBottomRight }}></span>
          {rightInset ? (
            <span style={{ ...markBase, right: 0, width: w, top: 0, bottom: 0 }}></span>
          ) : (
            <span style={{ ...markBase, right: -w, width: w, top: -w, bottom: -w }}></span>
          )}
        </>
      )}
    </button>
  );
}

export default ColorButton;
