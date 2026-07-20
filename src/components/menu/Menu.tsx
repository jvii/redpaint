import React, { JSX, useLayoutEffect, useRef, useState } from 'react';
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

  // The panel's open height is measured from its content rather than a
  // hand-picked pixel constant — the gadget grid reflows (icon size, wrapped
  // cluster rows, window width) far too often for a magic number to keep up.
  // scrollHeight reports the content's natural height regardless of the
  // explicit height clamp below, so this is safe to read every render.
  const menuMainRef = useRef<HTMLDivElement>(null);
  const [menuContentHeight, setMenuContentHeight] = useState(0);
  useLayoutEffect((): (() => void) | void => {
    const node = menuMainRef.current;
    if (!node) {
      return;
    }
    const measure = (): void => setMenuContentHeight(node.scrollHeight);
    measure();
    // covers reflow the state dependency array can't: wrapping caused purely
    // by a window resize, with no state change to re-trigger this effect
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return (): void => observer.disconnect();
  }, [
    state.app.brushDrawerOpen,
    state.brush.mode,
    state.toolbox.selectedSelectorToolId,
    usingBuiltInBrush,
  ]);

  return (
    <div
      className="menu"
      // measured from the content (see menuContentHeight above), not a
      // viewport percentage: overflow is hidden, so a too-small height
      // would clip the gadget grid instead of the panel just growing.
      style={{ height: state.app.menuOpen ? `${menuContentHeight}px` : '0px' }}
      onMouseLeave={close}
      onContextMenu={close}
    >
      <div className="menu__main" ref={menuMainRef}>
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
        <button className="menu__closebtn" onClick={close} type="button" aria-label="Close menu">
          &times;
        </button>
      </div>
    </div>
  );
}
