import { JSX } from 'react';
import './RetroInputField.css';

type Props = {
  // Sits inline before the field, as DPaint's own requesters label their
  // entries ("Width: [   ]"). Omit for a bare field that something else
  // already names.
  label?: string;
  // Held as a string, never a number, even for numeric fields: the field has
  // to be allowed to be empty or half-typed while it has focus, and a numeric
  // value would force "" back to 0 the moment the user cleared it to type a
  // new figure. Callers parse and clamp on commit.
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  // Width of the field in characters, so one sized for 4-digit pixel counts
  // doesn't stretch to fill whatever container it lands in.
  size?: number;
  // Digits rather than free text: asks mobile keyboards for the numeric layout
  // and centers the value, which is how a short figure wants to sit (and how
  // the slider readouts have always sat). Free text stays left-aligned, where
  // reading a filename starts.
  numeric?: boolean;
  // Enter commits, for a field whose requester has one obvious action — typing
  // a name and reaching for the mouse to confirm it is a step nobody wants.
  onEnter?: () => void;
};

// A labelled text entry: an optional Press Start 2P label beside the shared
// .retro-input field (index.css), the same treatment as the readout next to a
// RetroLabeledSlider — softer and rounded, so a field you type into doesn't
// read as a button you press.
//
// Always type="text", even when numeric. type="number" brings spinner arrows
// that are rounded, gradiented platform chrome no amount of bordering makes
// look like Workbench — a pixel count is typed, not nudged one at a time — and
// it refuses to report a half-typed value, which is the whole reason this holds
// a string.
export function RetroInputField({
  label,
  value,
  onChange,
  disabled = false,
  size = 4,
  numeric = false,
  onEnter,
}: Props): JSX.Element {
  const input = (
    <input
      className={
        'retro-input retro-input-field__input' +
        (numeric ? ' retro-input-field__input--numeric' : '')
      }
      type="text"
      inputMode={numeric ? 'numeric' : 'text'}
      value={value}
      disabled={disabled}
      style={{ width: `${size + 1}ch` }}
      onChange={(event): void => onChange(event.target.value)}
      onKeyDown={
        onEnter &&
        ((event): void => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onEnter();
          }
        })
      }
    />
  );

  if (!label) {
    return input;
  }

  return (
    <label className={'retro-input-field' + (disabled ? ' retro-input-field--disabled' : '')}>
      <span className="retro-input-field__label">{label}</span>
      {input}
    </label>
  );
}
