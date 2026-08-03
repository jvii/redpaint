import { JSX } from 'react';
import './RetroNumberField.css';

type Props = {
  label: string;
  // Held as a string, not a number, so the field can be empty or half-typed
  // while it has focus — a numeric value would force "" back to 0 the moment
  // the user clears it to type a new figure. Callers parse and clamp on commit.
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  // Width of the field in characters, so one sized for 4-digit pixel counts
  // doesn't stretch to fill whatever container it lands in.
  size?: number;
};

// A labelled text entry: a Press Start 2P label beside the shared .retro-input
// field (index.css), the same treatment as the readout next to a
// RetroLabeledSlider. Label inline before the field rather than above it,
// matching DPaint's own Set Page Size requester ("Width: [   ]").
//
// type="text" with inputMode="numeric" rather than type="number": the spinner
// arrows are rounded, gradiented platform chrome that no amount of bordering
// makes look like Workbench, and a pixel count is typed rather than nudged one
// at a time. It also sidesteps type="number" refusing to report a half-typed
// value, which is the whole reason this holds a string.
export function RetroNumberField({
  label,
  value,
  onChange,
  disabled = false,
  size = 4,
}: Props): JSX.Element {
  return (
    <label className={'retro-number' + (disabled ? ' retro-number--disabled' : '')}>
      <span className="retro-number__label">{label}</span>
      <input
        className="retro-input retro-number__input"
        type="text"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        style={{ width: `${size + 1}ch` }}
        onChange={(event): void => onChange(event.target.value)}
      />
    </label>
  );
}
