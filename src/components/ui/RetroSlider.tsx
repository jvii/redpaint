import React, { JSX } from 'react';
import './RetroSlider.css';

type Props = {
  value: number;
  min: number;
  max: number;
  step?: number;
  vertical?: boolean;
  onChange: (value: number) => void;
  // Greys out and ignores clicks/drags (still shows the current value), for
  // a slider that doesn't apply in the current context — same treatment as
  // RetroToggle's disabled prop.
  disabled?: boolean;
};

// Matches the thumb's 20px length in RetroSlider.css — needed here too so a
// click's position can be tested against where the thumb actually is.
const THUMB_LENGTH = 20;

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
  disabled = false,
}: Props): JSX.Element {
  // orient is a Firefox-only attribute for vertical range inputs; other
  // browsers use the writing-mode from the CSS class.
  const orientProps = vertical ? { orient: 'vertical' } : {};
  // unitless 0..1 fraction; the CSS scales it by the thumb's travel range
  // (track length minus thumb length) to place the fill edge and the thumb
  const fill = max > min ? (value - min) / (max - min) : 0;

  // Clicking the track steps by one instead of jumping to the click position
  // (the native range input's default) — above the thumb increases, below
  // decreases (vertical: min at the bottom, matching the fill direction);
  // left/right for horizontal. Clicking the thumb itself is left alone, so
  // dragging it still works normally. Same geometry as the CSS thumb
  // placement (RetroSlider.css), computed here so the click can be compared
  // against it.
  const handlePointerDown = (event: React.PointerEvent<HTMLInputElement>): void => {
    if (disabled) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const trackLength = vertical ? rect.height : rect.width;
    const thumbStart = (trackLength - THUMB_LENGTH) * (vertical ? 1 - fill : fill);
    const thumbEnd = thumbStart + THUMB_LENGTH;
    const clickPos = vertical ? event.clientY - rect.top : event.clientX - rect.left;

    let next: number | null = null;
    if (clickPos < thumbStart) {
      next = vertical ? value + step : value - step;
    } else if (clickPos > thumbEnd) {
      next = vertical ? value - step : value + step;
    }
    if (next !== null) {
      event.preventDefault();
      onChange(Math.max(min, Math.min(max, next)));
    }
  };

  return (
    <span
      className={
        'retro-slider' +
        (vertical ? ' retro-slider--vertical' : '') +
        (disabled ? ' retro-slider--disabled' : '')
      }
      style={{ '--retro-slider-fill': fill } as React.CSSProperties}
    >
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event): void => onChange(Number(event.target.value))}
        onPointerDown={handlePointerDown}
        {...orientProps}
      />
      <span className="retro-slider__fill"></span>
      <span className="retro-slider__remainder"></span>
      <span className="retro-slider__thumb"></span>
    </span>
  );
}
