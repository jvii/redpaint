import React, { JSX } from 'react';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { cycleDriver } from '../../canvas/CycleDriver';
import { encodeIlbm } from '../../fileformat/ilbm';
import { plainPalette } from '../../algorithm/imageColors';
import { useAppState } from '../../overmind';
import { Gadget, GadgetGroup } from './MenuGadgets';
import { icons, PixelIcon } from './pixelIcons';
import { saveCanvasAsPng, saveFile } from './saveAsPng';
import './DrawerMenu.css';

// The picture drawer: whole-image disk I/O (load/save PNG, save IFF ILBM) —
// DPaint's term for the canvas-as-a-whole, as opposed to a brush. Mutually
// exclusive with the Brush drawer (Menu.tsx's app.openDrawer radio group);
// unlike BrushMenu there's nothing to transform here, so it's a single File
// row.
export function PictureMenu({ onOpenFile }: { onOpenFile: () => void }): JSX.Element {
  const state = useAppState();

  const handleImageSave = (): void => {
    // The PNG is read straight off the drawing buffer, which would bake a
    // mid-cycle palette rotation into the file — hold the base colors until
    // the capture (which happens after the async save picker) completes.
    void cycleDriver.withBaseColors(async (): Promise<void> => {
      // preserveDrawingBuffer is on, but render once to be sure the buffer is current
      paintingCanvasController.render();
      await saveCanvasAsPng(paintingCanvasController.mainCanvas, 'redpaint.png');
    });
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
    const colors = plainPalette(Object.values(state.palette.palette));
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

  return (
    <div className="drawer-menu">
      <div className="wb-cluster__head drawer-menu__head">Picture</div>
      <div className="drawer-menu__row">
        {/* Reading and writing are separate groups, not one strip: a shared
            seam reads as "one set of related choices", and losing the picture
            to a mis-aimed click is the one thing in here that cannot be
            undone. The gap does the same work the icons' arrows do.
            Bare groups rather than GadgetCluster - the disks and their labels
            already say these are files, so a "File" head over them only added
            a word to read past, and with nothing headed left on this row
            there is no sibling for a blank head to align to either. */}
        <GadgetGroup>
          <Gadget
            icon={<PixelIcon map={icons.diskLoad} scale={2} />}
            label="Open"
            title="Open image..."
            onClick={onOpenFile}
          />
        </GadgetGroup>
        <GadgetGroup>
          <Gadget
            icon={<PixelIcon map={icons.diskSave} scale={2} />}
            label="Save"
            title="Save image..."
            onClick={handleImageSave}
          />
          <Gadget
            icon={<PixelIcon map={icons.diskSave} scale={2} />}
            label="Save IFF"
            title="Save as IFF..."
            onClick={handleImageSaveIlbm}
          />
        </GadgetGroup>
      </div>
      <div className="drawer-menu__spacer" />
    </div>
  );
}
