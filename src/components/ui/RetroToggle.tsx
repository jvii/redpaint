import { JSX, ReactNode } from 'react';
import './RetroToggle.css';

type Option = {
  value: string;
  label: ReactNode;
  // Greys out and ignores clicks on this segment only (the group stays live),
  // for options that don't apply in the current context.
  disabled?: boolean;
};

// How the segments are laid out. 'row' is a horizontal strip, 'column' a
// vertical stack, 'grid' an N-column grid (see the columns prop).
type Variant = 'row' | 'column' | 'grid';

type Props = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  variant?: Variant;
  // Number of columns for variant="grid" (ignored otherwise).
  columns?: number;
  // Greys out the whole group and ignores clicks (still shows which segment is
  // selected), for a toggle that doesn't apply in the current context.
  disabled?: boolean;
};

// A segmented toggle: a raised gadget group with one shared drop shadow, where
// the selected segment sits pressed-in (workbench blue, orange label). The
// component owns its layout and border seams so callers only pick a variant —
// segments always share a single 2px border where they meet, never a doubled
// one, whatever the shape.
export function RetroToggle({
  options,
  value,
  onChange,
  variant = 'row',
  columns = 2,
  disabled = false,
}: Props): JSX.Element {
  // Effective column count drives both the grid template and the seam math: a
  // row is one row of N, a column is N rows of one, a grid is N of `columns`.
  const cols = variant === 'grid' ? columns : variant === 'column' ? 1 : options.length;

  const style = variant === 'grid' ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined;

  return (
    <div
      className={
        `retro-toggle retro-toggle--${variant}` + (disabled ? ' retro-toggle--disabled' : '')
      }
      style={style}
    >
      {options.map((option, index): JSX.Element => {
        // Drop the border a neighbor already draws (the segment to the left, or
        // above) so meeting edges stay a single 2px line instead of doubling.
        const collapseLeft = index % cols > 0;
        const collapseTop = Math.floor(index / cols) > 0;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled || option.disabled}
            className={
              'retro-toggle__segment' +
              (option.value === value ? ' retro-toggle__segment--selected' : '') +
              (option.disabled ? ' retro-toggle__segment--disabled' : '') +
              (collapseLeft ? ' retro-toggle__segment--collapse-left' : '') +
              (collapseTop ? ' retro-toggle__segment--collapse-top' : '')
            }
            onClick={(): void => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
