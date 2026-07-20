import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { refreshBrushPreview } from '../GlobalHotkeyManager';
import { GadgetCluster } from './MenuGadgets';
import './BrushSlotStrip.css';

// The automatic companion to the curated slots (docs/brush-slots.md): the
// custom brush BrushRecall last replaced — capture, load, slot/Previous
// recall, and selecting a built-in all feed it, so switching away from a
// custom brush never silently drops it. No store/clear controls: the user
// doesn't curate this one, brushRecall does — so unlike BrushSlotStrip
// there's no download-glyph empty state (nothing to store here) and no
// Clear in the hover overlay (nothing to clear).
export function PreviousBrushSlot(): JSX.Element {
  const actions = useActions();
  const state = useAppState();
  const slot = state.brush.previousSlot;

  const recall = (): void => {
    actions.brush.recallPreviousBrush();
    actions.app.closeMenu();
    setTimeout(refreshBrushPreview, 150);
  };

  return (
    <GadgetCluster head="Previous">
      <div className="brush-slot-strip">
        <div className="brush-slot">
          <button
            className={'brush-slot__cell' + (slot.occupied ? ' is-occupied' : ' is-disabled')}
            type="button"
            title={
              slot.occupied ? 'Recall the previous custom brush' : 'No previous custom brush yet'
            }
            aria-label={
              slot.occupied ? 'Recall the previous custom brush' : 'No previous custom brush yet'
            }
            disabled={!slot.occupied}
            onClick={recall}
          >
            {slot.occupied && slot.thumbnail ? (
              <>
                <img className="brush-slot__thumbnail" src={slot.thumbnail} alt="" />
                <div className="brush-slot__overlay">
                  <span className="brush-slot__overlay-size">
                    {slot.size && (
                      <>
                        {slot.size.width}×{slot.size.height}
                      </>
                    )}
                  </span>
                </div>
              </>
            ) : (
              <span className="brush-slot__empty-label">N/A</span>
            )}
          </button>
        </div>
      </div>
    </GadgetCluster>
  );
}
