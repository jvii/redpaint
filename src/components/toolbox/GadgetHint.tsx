import React, { JSX } from 'react';
import './GadgetHint.css';

// What a toolbox gadget says about itself on hover.
//
// The toolbox is icon-only by design (docs/style-guide.md, "Text on
// controls"), which leaves no room for a label — and several gadgets carry a
// right-click action that an icon cannot hint at. Redo lived on a right-click
// for months and was reported as "doesn't work at all".
//
// The shape is a template, in this order, because a hint that answers the same
// questions in the same places can be read at a glance and one that rearranges
// them per gadget has to be read properly every time:
//
//   1. `use`         — what the gadget is for, as a sentence
//   2. `halves`      — what its two halves choose between, if it has two
//   3. `rightClick`  — what a right-click on it does
//   4. `rightClickKeys` — and the keys for that, if it has any
//
// Fields rather than a free-form list so the order cannot drift: there is no
// way to express "right-click first, then the halves".
//
// The two kinds of instruction are deliberately not alike. `use` is prose in
// full-strength ink, because it is about the picture — what happens on the
// canvas when you drag, or what the gadget does. The rows below it are a table
// with a dimmed label, and the label is always a gesture *on this gadget*.
// Grey therefore means exactly one thing — "do this to the gadget" — where
// before it covered both that and "drag on the canvas", which are not the same
// kind of instruction and should not have looked the same.
export type GadgetHint = {
  name: string;
  // Keyboard shortcuts for the gadget's own action, shown as keycaps beside
  // the name.
  keys?: string[];
  use?: string;
  halves?: { top: string; bottom: string };
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
function Keys({ keys }: { keys: string[] }): JSX.Element {
  return (
    <span className="gadget-hint__keys">
      {keys.map((key) => (
        <kbd className="wb-gadget__keycap gadget-hint__key" key={key}>
          {key}
        </kbd>
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
  const hasRows = hint.halves !== undefined || hint.rightClick !== undefined;
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
          {hint.halves && (
            <>
              <GadgetRow gesture="top half" does={hint.halves.top} />
              <GadgetRow gesture="bottom half" does={hint.halves.bottom} />
            </>
          )}
          {hint.rightClick && (
            <GadgetRow gesture="right-click" does={hint.rightClick} keys={hint.rightClickKeys} />
          )}
        </div>
      )}
    </div>
  );
}
