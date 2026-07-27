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
  // Renders a plain div+span instead of a native fieldset+legend, same
  // classes and visual result. Every group here disables its own controls
  // directly via their own `disabled` prop rather than relying on a native
  // fieldset cascading `disabled` to its descendants, so nothing depends on
  // this actually being a <fieldset> — use div when nesting one of these
  // inside another (a fieldset directly inside another fieldset's content,
  // as Fill Style's Range/Dither/Jitter groups do inside its Gradient box):
  // Safari has a longstanding bug where nested fieldsets don't reliably
  // recompute their auto-height after content changes.
  as?: 'fieldset' | 'div';
};

// A fieldset (or div, see `as`) with a Press Start 2P legend — the
// requester-group heading used throughout the dialogs (Colors, Resolution,
// True Color, ...). Borderless by default; pass `bordered` to draw a box
// around the group instead.
export function RetroFieldset({
  legend,
  children,
  className,
  bordered,
  as = 'fieldset',
}: Props): JSX.Element {
  const rootClassName = ['retro-fieldset', bordered && 'retro-fieldset--bordered', className]
    .filter(Boolean)
    .join(' ');
  if (as === 'div') {
    return (
      <div className={rootClassName}>
        {bordered ? (
          // A real border-top-line gap, not a same-colored patch painted over
          // a continuous border: the box has no top border of its own here,
          // just this stub+rule pair either side of the legend text, so
          // there's nothing translucent stacked on top of anything else to
          // mismatch — the legend sits directly on the box's own single
          // background layer, identical to everywhere else in it.
          <div className="retro-fieldset__legend-row">
            <span className="retro-fieldset__legend-stub" aria-hidden="true" />
            <span className="retro-fieldset__legend">{legend}</span>
            <span className="retro-fieldset__legend-rule" aria-hidden="true" />
          </div>
        ) : (
          <span className="retro-fieldset__legend">{legend}</span>
        )}
        {children}
      </div>
    );
  }
  return (
    <fieldset className={rootClassName}>
      <legend className="retro-fieldset__legend">{legend}</legend>
      {children}
    </fieldset>
  );
}
