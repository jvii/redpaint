import React, { JSX } from 'react';
import './RetroSlider.css';

type Props = {
  value: number;
  min: number;
  max: number;
  step?: number;
  vertical?: boolean;
  onChange: (value: number) => void;
};

// A composed slider (retroui's Slider look): an invisible native range
// input provides the interaction and keyboard/a11y behavior, while the
// track and thumb are drawn as sibling elements positioned from the value.
// Drawing our own visuals is what makes a real gap in the track possible —
// the thumb's interior is genuinely transparent, showing whatever
// background is behind the requester, with neither the track borders nor
// the orange fill passing through it. A native track can't express that
// (its border runs edge to edge behind the thumb), and browsers disagree
// on the native thumb's exact geometry anyway.
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
  // unitless 0..1 fraction; the CSS scales it by the thumb's travel range
  // (track length minus thumb length) to place the fill edge and the thumb
  const fill = max > min ? (value - min) / (max - min) : 0;
  return (
    <span
      className={'retro-slider' + (vertical ? ' retro-slider--vertical' : '')}
      style={{ '--retro-slider-fill': fill } as React.CSSProperties}
    >
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event): void => onChange(Number(event.target.value))}
        {...orientProps}
      />
      <span className="retro-slider__fill"></span>
      <span className="retro-slider__remainder"></span>
      <span className="retro-slider__thumb"></span>
    </span>
  );
}
