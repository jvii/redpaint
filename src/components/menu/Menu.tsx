import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { Mode } from '../../overmind/brush/state';
import { MODE_ORDER } from '../../overmind/brush/mode';
import { RetroToggle } from '../ui/RetroToggle';
import { Gadget, GadgetGroup, useFileOpener } from './MenuGadgets';
import { icons, PixelIcon } from './pixelIcons';
import { ScreenStatus } from './ScreenStatus';
import { BrushMenu } from './BrushMenu';
import { saveCanvasAsPng, saveFile } from './saveAsPng';
import { encodeIlbm, isIlbmHeader } from '../../fileformat/ilbm';
import { refreshBrushPreview } from '../GlobalHotkeyManager';
import './Menu.css';

// IFF is recognized by content, not extension — extensions in the wild vary
// (.iff, .lbm, .ilbm) and lie; isIlbmHeader knows what content qualifies.
async function isIffFile(file: File): Promise<boolean> {
  return isIlbmHeader(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
}

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
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    // every dialog-opening action closes the menu first (see ScreenStatus's
    // openScreenFormat) — beginImageLoad's requester opens asynchronously
    // (after decode), so without this the still-open menu (z-index above the
    // modal) hides it once it appears
    actions.app.closeMenu();
    void (async (): Promise<void> => {
      if (await isIffFile(file)) {
        actions.app.beginIlbmLoad(file);
      } else {
        // decodes, then opens the load requester (color treatment)
        actions.app.beginImageLoad(URL.createObjectURL(file));
      }
    })();
  };

  const handleBrushFileOpen = (input: HTMLInputElement): void => {
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    actions.app.closeMenu();
    // decodes, then opens the load requester (color treatment)
    actions.app.beginBrushLoad(URL.createObjectURL(file));
  };

  // Both file inputs render once below, outside the menu's collapsible
  // content (see the mount-location comment on useFileOpener) — the trigger
  // buttons stay wherever they visually belong (the rail here, the drawer's
  // File cluster for the brush one, via the `open` passed down to BrushMenu).
  const imageOpener = useFileOpener(handleImageFileOpen, 'image/*,.iff,.ilbm,.lbm');
  const brushOpener = useFileOpener(handleBrushFileOpen);

  const handleImageSave = (): void => {
    // preserveDrawingBuffer is on, but render once to be sure the buffer is current
    paintingCanvasController.render();
    saveCanvasAsPng(paintingCanvasController.mainCanvas, 'redpaint.png');
  };

  const handleImageSaveIlbm = (): void => {
    const colorIndex = paintingCanvasController.getCanvasColorIndex();
    const pixels = colorIndex?.toIndexedPixels();
    if (!colorIndex || !pixels) {
      alert(
        'The image has True Color pixels — IFF ILBM stores palette-indexed pixels only. ' +
          'Turn True Color off in Screen Format first.'
      );
      return;
    }
    // plain copies: proxied state objects don't belong in a tight encode loop
    const palette = state.palette.palette;
    const colors = Object.values(palette).map((c) => ({ r: c.r, g: c.g, b: c.b }));
    const cycleRanges = state.palette.ranges.flatMap((range) =>
      range
        ? [
            {
              low: Number(range.start) - 1,
              high: Number(range.end) - 1,
              rate: range.rate,
              active: range.active,
              reverse: range.reverse,
            },
          ]
        : []
    );
    const bytes = encodeIlbm({
      width: colorIndex.width,
      height: colorIndex.height,
      palette: colors,
      pixels,
      cycleRanges,
    });
    void saveFile(async () => new Blob([bytes], { type: 'image/x-ilbm' }), 'redpaint.iff', {
      description: 'IFF ILBM image',
      mime: 'image/x-ilbm',
      extension: '.iff',
    });
  };

  // for disabling Matte mode selection when using a built-in brush
  const usingBuiltInBrush = state.brush.selectedBuiltInBrushId !== null;

  return (
    <div
      className={'menu' + (state.app.menuOpen ? ' menu--open' : '')}
      onMouseLeave={(event): void => {
        // The menubar sits directly above the drop-down panel, so leaving
        // upward onto it fires this same as leaving out to the canvas — but
        // the menubar's own onClick already owns toggling, so don't race it.
        const related = event.relatedTarget as Node | null;
        if (related instanceof Element && related.closest('.menubar')) {
          return;
        }
        close();
      }}
      onContextMenu={(event): void => {
        event.preventDefault(); // right-click closes the menu, not the browser's own menu
        close();
        // Closing uncovers the canvas under the pointer, but the overlay
        // cursor only repaints on mousemove — replay one so it's visible
        // immediately instead of only after the mouse next moves.
        setTimeout(refreshBrushPreview, 0);
      }}
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
                  <Gadget
                    icon={<PixelIcon map={icons.image} scale={1} />}
                    label="Open"
                    title="Open image..."
                    onClick={imageOpener.open}
                  />
                  <Gadget
                    icon={<PixelIcon map={icons.disk} scale={3} />}
                    label="Save"
                    title="Save image..."
                    onClick={handleImageSave}
                  />
                  <Gadget
                    icon={<PixelIcon map={icons.disk} scale={3} />}
                    label="Save IFF"
                    title="Save as IFF..."
                    onClick={handleImageSaveIlbm}
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
                  onChange={(value): void => {
                    actions.brush.setMode(value as Mode);
                    close();
                    // Matte/Repl swap the overlay cursor between the matte and
                    // colorized brush bitmap; without this it stays stale until
                    // the mouse next moves over the canvas.
                    setTimeout(refreshBrushPreview, 0);
                  }}
                  options={MODE_ORDER.map((m, i) => ({
                    value: m,
                    label: (
                      <span className="menu__mode-label">
                        {m}
                        <kbd className="wb-gadget__keycap menu__mode-keycap">{`F${i + 1}`}</kbd>
                      </span>
                    ),
                    disabled: (m === 'Matte' || m === 'Repl') && usingBuiltInBrush,
                  }))}
                />
              </div>
              {state.app.brushDrawerOpen && <BrushMenu onOpenFile={brushOpener.open} />}
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
      {imageOpener.input}
      {brushOpener.input}
    </div>
  );
}
