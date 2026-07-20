import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { Mode } from '../../overmind/brush/state';
import { RetroToggle } from '../ui/RetroToggle';
import { Gadget, GadgetGroup, GadgetOpen } from './MenuGadgets';
import { icons, PixelIcon } from './pixelIcons';
import { ScreenStatus } from './ScreenStatus';
import { BrushMenu } from './BrushMenu';
import { saveCanvasAsPng } from './saveAsPng';
import './Menu.css';

// rail mode-toggle order: two rows of four, reading order matching the old
// Mode column
const MODE_ORDER: Mode[] = ['Matte', 'Color', 'Repl', 'Smear', 'Shade', 'Blend', 'Cycle', 'Smooth'];

// The drop-down menu panel under the menubar: the screen status strip and
// gadget rail, the always-visible mode row, and the brush drawer.
//
// The panel collapses via the CSS grid-template-rows 0fr/1fr trick
// (Menu.css) instead of a JS-measured pixel height, which means the content
// below can unmount entirely while closed rather than staying permanently
// mounted (at height: 0) just to keep a scrollHeight measurement warm. A
// permanently-mounted menu was quietly re-rendering — and, in one
// discovered case, redoing expensive brush-thumbnail work — on every state
// change any of its subscribed descendants cared about, even while fully
// hidden. The grid trick sizes to intrinsic content height with no JS
// measurement at all, so there's no longer a reason to keep anything
// mounted just for that.
export function Menu(): JSX.Element {
  const actions = useActions();
  const state = useAppState();

  const close = (): void => {
    actions.app.closeMenu();
  };

  const handleImageFileOpen = (input: HTMLInputElement): void => {
    if (input.files?.[0]) {
      // decodes, then opens the load requester (color treatment)
      actions.app.beginImageLoad(URL.createObjectURL(input.files[0]));
    }
  };

  const handleImageSave = (): void => {
    // preserveDrawingBuffer is on, but render once to be sure the buffer is current
    paintingCanvasController.render();
    saveCanvasAsPng(paintingCanvasController.mainCanvas, 'redpaint.png');
  };

  // for disabling Matte mode selection when using a built-in brush
  const usingBuiltInBrush = state.brush.selectedBuiltInBrushId !== null;

  return (
    <div
      className={'menu' + (state.app.menuOpen ? ' menu--open' : '')}
      onMouseLeave={close}
      onContextMenu={close}
    >
      <div className="menu__collapse">
        {state.app.menuOpen && (
          <>
            <div className="menu__main">
              {/* Live screen state readout plus the gadget rail beside it */}
              <div className="menu__status">
                <ScreenStatus />
                {/* image disk I/O, one click from the rail */}
                <GadgetGroup>
                  <GadgetOpen
                    icon={<PixelIcon map={icons.image} scale={1} />}
                    label="Open"
                    title="Open image..."
                    handleFile={handleImageFileOpen}
                  />
                  <Gadget
                    icon={<PixelIcon map={icons.disk} scale={3} />}
                    label="Save"
                    title="Save image..."
                    onClick={handleImageSave}
                  />
                </GadgetGroup>
                {/* everything brush lives behind this: transforms + brush disk */}
                <GadgetGroup>
                  <Gadget
                    icon={<PixelIcon map={icons.brush} scale={3} />}
                    label="Brush"
                    title="Brush tools"
                    on={state.app.brushDrawerOpen}
                    onClick={actions.app.toggleBrushDrawer}
                  />
                </GadgetGroup>
              </div>
              {/* every mode one click away; the pressed segment is the mode
                  display. Matte and Repl are custom-brush-only, as before. */}
              <div className="menu__mode-row">
                <div className="wb-cluster__head">Mode</div>
                <RetroToggle
                  variant="row"
                  value={state.brush.mode}
                  onChange={(value): void => actions.brush.setMode(value as Mode)}
                  options={MODE_ORDER.map((m) => ({
                    value: m,
                    label: m,
                    disabled: (m === 'Matte' || m === 'Repl') && usingBuiltInBrush,
                  }))}
                />
              </div>
              {state.app.brushDrawerOpen && <BrushMenu />}
            </div>
            <div className="menu__close">
              <button
                className="menu__closebtn"
                onClick={close}
                type="button"
                aria-label="Close menu"
              >
                &times;
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
