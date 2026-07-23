import { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { Color } from '../../types';
import { colorToRGBString } from '../../tools/util/util';
import { StoreIcon } from '../menu/BrushSlotIcons';
import './RangeSlotStrip.css';

// A hard-edged strip of the range's actual colors (one stripe per palette
// slot it spans), not a 2-stop CSS gradient between just the endpoints —
// the in-between colors aren't guaranteed to be a perfect ramp (a hand-
// authored palette, or one loaded from a file), so this reads as a genuine
// preview rather than an approximation.
function rangeSwatchBackground(colors: Color[]): string {
  const n = colors.length;
  if (n === 0) {
    return 'transparent';
  }
  if (n === 1) {
    return colorToRGBString(colors[0]);
  }
  const stops = colors.flatMap((color, i) => {
    const rgb = colorToRGBString(color);
    return [`${rgb} ${(i * 100) / n}%`, `${rgb} ${((i + 1) * 100) / n}%`];
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

// Range slots, interacted with the same way as the brush-slot strip
// (BrushSlotStrip.tsx): an empty slot has one minimal affordance, an
// occupied slot is a plain swatch with a "Range N" label and Clear
// revealed only on hover. The one departure from that parity: a range
// genuinely needs two colors, not one, so an empty slot's click arms a
// "pick the end color on the palette grid" flow (the currently edited
// color becomes the start) rather than storing something outright the way
// a brush slot's click does.
export function RangeSlotStrip(): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  const activeRangeIndex = state.paletteEditor.activeRangeIndex;
  const armedForRange = state.paletteEditor.armedAction === 'range';

  const selectOrArm = (index: number) => (): void => {
    const isArmedForThis = activeRangeIndex === index && armedForRange;
    actions.paletteEditor.selectRange(index);
    if (!isArmedForThis) {
      actions.paletteEditor.armAction('range');
    }
  };

  const select = (index: number) => (): void => {
    actions.paletteEditor.selectRange(index);
  };

  const clear =
    (index: number) =>
    (event: React.SyntheticEvent): void => {
      event.stopPropagation();
      actions.palette.clearRange(index);
    };

  const activateOnKey =
    (handler: () => void) =>
    (event: React.KeyboardEvent): void => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handler();
      }
    };

  return (
    <div className="range-slot-strip">
      {state.palette.ranges.map((range, index) => {
        const isActive = activeRangeIndex === index;

        if (!range) {
          const isArmed = isActive && armedForRange;
          const label = isArmed ? 'Pick the end color on the palette' : `Set range ${index + 1}`;
          return (
            <div className="range-slot" key={index}>
              <div
                className={'range-slot__cell' + (isArmed ? ' is-armed' : '')}
                role="button"
                tabIndex={0}
                title={label}
                aria-label={label}
                onClick={selectOrArm(index)}
                onKeyDown={activateOnKey(selectOrArm(index))}
              >
                {isArmed ? (
                  <span className="range-slot__armed-label">Pick end color</span>
                ) : (
                  <StoreIcon className="range-slot__icon" />
                )}
              </div>
            </div>
          );
        }

        const start = Number(range.start);
        const end = Number(range.end);
        const colors: Color[] = [];
        for (let id = start; id <= end; id++) {
          const color = state.palette.palette[String(id)];
          if (color) {
            colors.push(color);
          }
        }

        return (
          <div className="range-slot" key={index}>
            <div
              className={'range-slot__cell is-occupied' + (isActive ? ' is-active' : '')}
              role="button"
              tabIndex={0}
              title={`Select range ${index + 1}`}
              aria-label={`Select range ${index + 1}`}
              style={{ background: rangeSwatchBackground(colors) }}
              onClick={select(index)}
              onKeyDown={activateOnKey(select(index))}
            >
              <div className="range-slot__overlay">
                <span className="range-slot__overlay-label">Range {index + 1}</span>
                <button
                  className="range-slot__overlay-clear"
                  type="button"
                  title={`Clear range ${index + 1}`}
                  aria-label={`Clear range ${index + 1}`}
                  onClick={clear(index)}
                >
                  &times;
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
