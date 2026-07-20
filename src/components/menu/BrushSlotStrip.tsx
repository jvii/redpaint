import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { refreshBrushPreview } from '../GlobalHotkeyManager';
import { GadgetCluster } from './MenuGadgets';
import { StoreIcon } from './BrushSlotIcons';
import './BrushSlotStrip.css';

// The brush-slot strip (docs/brush-slots.md Phase B): no permanently-visible
// controls. An empty slot is just the download-glyph well ("store the
// current brush here"); an occupied slot is a plain thumbnail, with the
// size caption and the Clear control revealed only on hover, as an overlay
// bar — so filling a slot again means clearing it first, deliberately,
// rather than overwriting it by accident.
export function BrushSlotStrip(): JSX.Element {
  const actions = useActions();
  const state = useAppState();

  const usingBuiltInBrush = state.brush.selectedBuiltInBrushId !== null;

  // recall changes the active brush, so it closes the menu and refreshes
  // the cursor like the transform gadgets do; store is bookkeeping (like
  // File Save) and leaves the menu open so several slots can be filled in
  // one visit
  const recall = (index: number) => (): void => {
    actions.brush.recallBrushFromSlot(index);
    actions.app.closeMenu();
    setTimeout(refreshBrushPreview, 150);
  };

  const store = (index: number) => (): void => {
    if (usingBuiltInBrush) {
      return; // nothing to store from a built-in
    }
    actions.brush.storeBrushInSlot(index);
  };

  // the clear control sits inside the cell's own click target (an overlay
  // over the recall button, not literally nested inside it — buttons can't
  // nest), so its own clicks must not also fire the cell's
  const clear = (index: number) => (event: React.SyntheticEvent): void => {
    event.stopPropagation();
    actions.brush.clearBrushSlot(index);
  };

  return (
    <GadgetCluster head="Slots">
      <div className="brush-slot-strip">
        {state.brush.slots.map((slot, index) => (
          <div className="brush-slot" key={index}>
            <div
              className={
                'brush-slot__cell' +
                (slot.occupied ? ' is-occupied' : '') +
                (!slot.occupied && usingBuiltInBrush ? ' is-disabled' : '')
              }
              role="button"
              tabIndex={0}
              title={
                slot.occupied
                  ? `Recall brush ${index + 1}`
                  : `Store current brush in slot ${index + 1}`
              }
              aria-label={
                slot.occupied
                  ? `Recall brush ${index + 1}`
                  : `Store current brush in slot ${index + 1}`
              }
              onClick={slot.occupied ? recall(index) : store(index)}
              onKeyDown={(event): void => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  (slot.occupied ? recall(index) : store(index))();
                }
              }}
            >
              {slot.occupied ? (
                <>
                  {slot.thumbnail && (
                    <img className="brush-slot__thumbnail" src={slot.thumbnail} alt="" />
                  )}
                  <div className="brush-slot__overlay">
                    <span className="brush-slot__overlay-size">
                      {slot.size && (
                        <>
                          {slot.size.width}×{slot.size.height}
                        </>
                      )}
                    </span>
                    <button
                      className="brush-slot__overlay-clear"
                      type="button"
                      title={`Clear slot ${index + 1}`}
                      aria-label={`Clear slot ${index + 1}`}
                      onClick={clear(index)}
                    >
                      &times;
                    </button>
                  </div>
                </>
              ) : (
                <StoreIcon className="brush-slot__store-icon" />
              )}
            </div>
          </div>
        ))}
      </div>
    </GadgetCluster>
  );
}
