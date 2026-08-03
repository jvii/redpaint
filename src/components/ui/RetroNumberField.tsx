import { JSX } from 'react';
import './RetroNumberField.css';

type Props = {
  label: string;
  // Held as a string, not a number, so the field can be empty or
  // half-typed while it has focus — a numeric value would force "" back to
  // 0 the moment the user clears it to type a new figure. Callers parse and
  // clamp on commit.
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  // Width of the input in characters, so a field sized for 4-digit pixel
  // counts doesn't stretch to fill whatever container it lands in.
  size?: number;
};

// A labelled number entry in the gadget idiom: 2px ink border, paper face, one
// hard drop shadow, no radius. The browser's spinner arrows are suppressed —
// they're a rounded, gradiented piece of platform chrome that no amount of
// bordering makes look like Workbench, and pixel counts are typed, not nudged.
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
        className="retro-number__input"
        type="number"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        size={size}
        style={{ width: `${size + 1}ch` }}
        onChange={(event): void => onChange(event.target.value)}
      />
    </label>
  );
}
