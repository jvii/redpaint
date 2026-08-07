import React, { JSX } from 'react';
import './GadgetHint.css';

// What a toolbox gadget says about itself on hover.
//
// The toolbox is icon-only by design (docs/style-guide.md, "Text on
// controls"), which leaves no room for a label — and several gadgets carry a
// right-click action that an icon cannot hint at. Redo lived on a right-click
// for months and was reported as "doesn't work at all"; the shape gadgets have
// three actions each between their two halves.
//
// Rows rather than a sentence because that is the shape of the information:
// which gesture, what it does. A shape gadget's three lines would be an
// unreadable sentence and are an obvious little table.
export type GadgetHint = {
  name: string;
  // The primary keyboard shortcut, shown as a keycap. Omitted where there is
  // none — most tools.
  key?: string;
  // Gesture → what it does. Only where the gesture is not the obvious one:
  // a plain click on a tool gadget needs no explaining.
  rows?: { gesture: string; does: string }[];
};

// Placed by the hover manager, which measures the gadget. Fixed rather than
// absolute: .canvas-toolbox-container clips its overflow, so a panel
// positioned inside the toolbox would be cut off at the column's edge.
export type HintPlacement = {
  // distance from the window's right edge to the gadget's left edge, so the
  // panel sits just left of the toolbox column it belongs to
  right: number;
  // one or the other, so a gadget low in the column grows upward instead of
  // off the bottom of the window
  top?: number;
  bottom?: number;
  // Where the arrow meets the panel's right edge, as a CSS length. Aligned
  // with the gadget's own middle rather than the panel's: the panel is taller
  // than a 40px gadget, so a centred arrow would point below it.
  arrow: string;
};

export function GadgetHintPanel({
  hint,
  at,
}: {
  hint: GadgetHint;
  at: HintPlacement;
}): JSX.Element {
  return (
    <div
      className="wb-callout wb-callout--points-right gadget-hint"
      style={
        {
          right: at.right,
          top: at.top,
          bottom: at.bottom,
          '--callout-arrow': at.arrow,
        } as React.CSSProperties
      }
    >
      <div className="gadget-hint__head">
        <span className="gadget-hint__name">{hint.name}</span>
        {hint.key && <kbd className="wb-gadget__keycap gadget-hint__key">{hint.key}</kbd>}
      </div>
      {hint.rows && hint.rows.length > 0 && (
        <div className="gadget-hint__rows">
          {hint.rows.map((row) => (
            <div className="gadget-hint__row" key={row.gesture}>
              <span className="gadget-hint__gesture">{row.gesture}</span>
              <span className="gadget-hint__does">{row.does}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
