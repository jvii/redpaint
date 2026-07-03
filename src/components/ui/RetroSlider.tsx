import { JSX } from 'react';
import './RetroSlider.css';

type Props = {
  value: number;
  min: number;
  max: number;
  step?: number;
  vertical?: boolean;
  onChange: (value: number) => void;
};

// A native range input in requester clothes: white track with a black border
// and a square workbench blue thumb.
export function RetroSlider({
  value,
  min,
  max,
  step = 1,
  vertical = false,
  onChange,
}: Props): JSX.Element {
  // orient is a Firefox-only attribute for vertical range inputs; other
  // browsers use the writing-mode from the CSS class.
  const orientProps = vertical ? { orient: 'vertical' } : {};
  return (
    <input
      type="range"
      className={'retro-slider' + (vertical ? ' retro-slider--vertical' : '')}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event): void => onChange(Number(event.target.value))}
      {...orientProps}
    />
  );
}
