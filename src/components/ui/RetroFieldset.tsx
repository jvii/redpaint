import { JSX, ReactNode } from 'react';
import './RetroFieldset.css';

type Props = {
  legend: string;
  children: ReactNode;
  // Lets a caller scope its own per-group content rules (e.g. styling the
  // RetroToggle segments inside) without reaching into this component's own
  // class names.
  className?: string;
  // Draws a border with the legend straddling it, for grouping several
  // controls into one visible box (e.g. Fill Style's "Gradient" box) rather
  // than just heading one. Off by default — most uses are the plain
  // borderless heading.
  bordered?: boolean;
};

// A fieldset with a Press Start 2P legend — the requester-group heading used
// throughout the dialogs (Colors, Resolution, True Color, ...). Borderless by
// default; pass `bordered` to draw a box around the group instead.
export function RetroFieldset({ legend, children, className, bordered }: Props): JSX.Element {
  return (
    <fieldset
      className={[
        'retro-fieldset',
        bordered && 'retro-fieldset--bordered',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <legend className="retro-fieldset__legend">{legend}</legend>
      {children}
    </fieldset>
  );
}
