import React, { JSX } from 'react';
import { shortcutCap } from '../ui/shortcutCap';
import './GadgetHint.css';

// What a toolbox gadget says about itself on hover. The toolbox is icon-only by
// design (docs/style-guide.md, "Text on controls"), and several gadgets carry a
// right-click action no icon can hint at.
//
// A fixed template rather than a free-form list, so the same questions are
// always answered in the same places and the order cannot drift:
//
//   1. `use`         — what the gadget is for, as a sentence
//   2. `parts`       — what its own parts do, if it is divided into any
//   3. `rightClick`  — what a right-click on it does
//   4. `rightClickKeys` — and the keys for that, if it has any
//
// The two kinds of instruction look different on purpose. `use` is prose in
// full-strength ink, about the picture. The rows below are a table with a dimmed
// label, and that label is always a gesture on this gadget, so grey means
// exactly one thing.
export type GadgetHint = {
  name: string;
  // Keyboard shortcuts for the gadget's own action, shown as keycaps beside
  // the name.
  keys?: string[];
  use?: string;
  // The gadget's own parts: the halves of a dual toggle, the swatches of the
  // colour indicator. Labelled rather than assumed to be a top and a bottom
  // half, since not every divided gadget is divided that way. `keys` here as
  // well as on the head because a divided gadget's halves have a key each:
  // DPaint's lowercase for the unfilled shape, shifted for the filled.
  parts?: { gesture: string; does: string; keys?: string[] }[];
  rightClick?: string;
  rightClickKeys?: string[];
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

// Grouped rather than loose, so the head's space-between separates the name
// from the shortcuts instead of spreading name and every key evenly apart.
//
// Joined by "or", because these are alternatives and two caps side by side read
// as a chord: u ⌘Z looks like something you press together.
//
// Written through shortcutCap, so a binding stored the way the code reads it
// (case-sensitive, DPaint's convention: 'R' is Shift-R) reaches the reader as
// the chord to press rather than a bare capital.
function Keys({ keys }: { keys: string[] }): JSX.Element {
  return (
    <span className="gadget-hint__keys">
      {keys.map((key, i) => (
        <span className="gadget-hint__key-alt" key={key}>
          {i > 0 && <span className="gadget-hint__or">or</span>}
          <kbd className="wb-gadget__keycap gadget-hint__key">{shortcutCap(key)}</kbd>
        </span>
      ))}
    </span>
  );
}

function GadgetRow({
  gesture,
  does,
  keys,
}: {
  gesture: string;
  does: string;
  keys?: string[];
}): JSX.Element {
  return (
    <div className="gadget-hint__row">
      <span className="gadget-hint__gesture">{gesture}</span>
      <span className="gadget-hint__does">
        {does}
        {keys && keys.length > 0 && <Keys keys={keys} />}
      </span>
    </div>
  );
}

export function GadgetHintPanel({
  hint,
  at,
}: {
  hint: GadgetHint;
  at: HintPlacement;
}): JSX.Element {
  const hasRows = (hint.parts && hint.parts.length > 0) || hint.rightClick !== undefined;
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
        {hint.keys && hint.keys.length > 0 && <Keys keys={hint.keys} />}
      </div>
      {hint.use && <p className="gadget-hint__use">{hint.use}</p>}
      {hasRows && (
        <div className="gadget-hint__rows">
          {hint.parts?.map((part) => (
            <GadgetRow
              key={part.gesture}
              gesture={part.gesture}
              does={part.does}
              keys={part.keys}
            />
          ))}
          {hint.rightClick && (
            <GadgetRow gesture="right-click" does={hint.rightClick} keys={hint.rightClickKeys} />
          )}
        </div>
      )}
    </div>
  );
}
