import { JSX, useEffect, useState } from 'react';
import './RetroLabeledSlider.css';
import { RetroSlider } from './RetroSlider';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  vertical?: boolean;
};

// A RetroSlider (vertical by default) with its label above and a
// directly-editable numeric readout below. The readout keeps its own text
// buffer so a value can be typed freely (including transiently
// invalid/empty states) and is only clamped and committed on blur/Enter.
export function RetroLabeledSlider({
  label,
  value,
  min,
  max,
  onChange,
  vertical = true,
}: Props): JSX.Element {
  const [text, setText] = useState(String(value));

  useEffect((): void => {
    setText(String(value));
  }, [value]);

  function commit(): void {
    const parsed = Math.round(Number(text));
    if (Number.isNaN(parsed)) {
      setText(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    setText(String(clamped));
    if (clamped !== value) {
      onChange(clamped);
    }
  }

  return (
    <div className={'retro-labeled-slider' + (vertical ? '' : ' retro-labeled-slider--horizontal')}>
      <span className="retro-labeled-slider__label">{label}</span>
      <div className="retro-labeled-slider__track">
        <RetroSlider vertical={vertical} value={value} min={min} max={max} onChange={onChange} />
      </div>
      <input
        className="retro-labeled-slider__input"
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(event): void => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event): void => {
          if (event.key === 'Enter') {
            (event.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}
