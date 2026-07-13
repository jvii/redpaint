import { JSX, ReactNode } from 'react';
import './RetroFieldset.css';

type Props = {
  legend: string;
  children: ReactNode;
  // Lets a caller scope its own per-group content rules (e.g. styling the
  // RetroToggle segments inside) without reaching into this component's own
  // class names.
  className?: string;
};

// A borderless fieldset with a Press Start 2P legend — the requester-group
// heading used throughout the dialogs (Colors, Resolution, True Color, ...).
export function RetroFieldset({ legend, children, className }: Props): JSX.Element {
  return (
    <fieldset className={['retro-fieldset', className].filter(Boolean).join(' ')}>
      <legend className="retro-fieldset__legend">{legend}</legend>
      {children}
    </fieldset>
  );
}
