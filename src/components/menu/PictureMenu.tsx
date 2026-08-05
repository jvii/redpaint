import React, { JSX } from 'react';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { cycleDriver } from '../../canvas/CycleDriver';
import { encodeIlbm } from '../../fileformat/ilbm';
import { plainPalette } from '../../algorithm/imageColors';
import { useActions, useAppState } from '../../overmind';
import { Gadget, GadgetCluster, GadgetGroup } from './MenuGadgets';
import { icons, PixelIcon } from './pixelIcons';
import { CropIcon } from './transformIcons';
import { canvasPngBlob, PNG_FILE_TYPE, saveFileAs, SaveTarget, writeToHandle } from './saveAsPng';
import { fileHandleFor, rememberFileHandle, SaveFormat } from './savedFileHandle';
import { beginSaveNamePrompt } from './pendingSaveName';
import './DrawerMenu.css';

// The picture drawer: whole-image disk I/O (load/save PNG, save IFF ILBM) —
// DPaint's term for the canvas-as-a-whole, as opposed to a brush. Mutually
// exclusive with the Brush drawer (Menu.tsx's app.openDrawer radio group);
// unlike BrushMenu there's nothing to transform here, so it's a single File
// row.
export function PictureMenu({ onOpenFile }: { onOpenFile: () => void }): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  // What a save offers as the name: whatever the document is already called,
  // falling back to the app's own default. Held without an extension, so
  // saving a PNG and then an IFF offers "mypic.png" and "mypic.iff" rather
  // than "mypic.png.iff".
  const baseName = state.app.documentName || 'redpaint';
  // Only reached on the browsers with no showSaveFilePicker; saveFile decides,
  // since it is the one that knows which route it is taking.
  // A written file is now what the document is: it takes that name, there is
  // nothing left unsaved, and — where the browser gave us one — the handle is
  // kept so the next plain Save can go straight back to that file.
  const remember = (format: SaveFormat, target: SaveTarget | null): void => {
    if (target === null) {
      return; // cancelled, or nothing written
    }
    rememberFileHandle(format, target.handle);
    actions.app.setDocumentName(target.name);
    actions.app.markDocumentClean();
  };

  const promptForName = (suggested: string): Promise<string | null> => {
    const extension = suggested.slice(suggested.lastIndexOf('.'));
    // The menu is still open — a save is clicked from inside it — and its panel
    // is translucent and above the requesters, so leaving it up would tint this
    // one blue and swallow its clicks. Every other route into a requester
    // closes the menu the same way (ScreenStatus, crop.begin).
    actions.app.closeMenu();
    actions.app.openSaveNamePrompt({ suggested, extension });
    return beginSaveNamePrompt();
  };

  // The PNG is read straight off the drawing buffer, which would bake a
  // mid-cycle palette rotation into the file — hold the base colors until the
  // capture (which happens after the async save picker) completes.
  const withPngBlob = (use: (makeBlob: () => Promise<Blob | null>) => Promise<void>): void => {
    void cycleDriver.withBaseColors(async (): Promise<void> => {
      // preserveDrawingBuffer is on, but render once to be sure it is current
      paintingCanvasController.render();
      await use(canvasPngBlob(paintingCanvasController.mainCanvas));
    });
  };

  const savePngAs = (): void => {
    withPngBlob(async (makeBlob): Promise<void> => {
      remember('png', await saveFileAs(makeBlob, `${baseName}.png`, PNG_FILE_TYPE, promptForName));
    });
  };

  // Plain Save: back to the same file with no dialog where the browser allows
  // it, and otherwise straight to a download under the name already chosen. It
  // only asks when there is nothing to repeat — a document nobody has named
  // yet, or a handle that has gone stale.
  const savePng = (): void => {
    withPngBlob(async (makeBlob): Promise<void> => {
      const handle = fileHandleFor('png');
      if (handle && (await writeToHandle(handle, makeBlob))) {
        actions.app.markDocumentClean();
        return;
      }
      if (state.app.documentName && !handle) {
        // the download branch: no handle to write to, but a name to reuse, so
        // this saves without asking again
        remember('png', await saveFileAs(makeBlob, `${baseName}.png`, PNG_FILE_TYPE));
        return;
      }
      remember('png', await saveFileAs(makeBlob, `${baseName}.png`, PNG_FILE_TYPE, promptForName));
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
    const makeBlob = async (): Promise<Blob> => new Blob([bytes], { type: 'image/x-ilbm' });
    const fileType = { description: 'IFF ILBM image', mime: 'image/x-ilbm', extension: '.iff' };
    void (async (): Promise<void> => {
      const handle = fileHandleFor('iff');
      if (handle && (await writeToHandle(handle, makeBlob))) {
        actions.app.markDocumentClean();
        return;
      }
      remember(
        'iff',
        await saveFileAs(
          makeBlob,
          `${baseName}.iff`,
          fileType,
          state.app.documentName && !handle ? undefined : promptForName
        )
      );
    })();
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
            title="Save the picture, to the same file where the browser allows it"
            onClick={savePng}
          />
          <Gadget
            icon={<PixelIcon map={icons.diskSave} scale={2} />}
            label="Save As"
            title="Save the picture under a new name..."
            onClick={savePngAs}
          />
          <Gadget
            icon={<PixelIcon map={icons.diskSave} scale={2} />}
            label="Save IFF"
            title="Save as IFF..."
            onClick={handleImageSaveIlbm}
          />
        </GadgetGroup>
      </div>
      {/* Its own headed cluster rather than a fourth gadget on the File row:
          that row is disk I/O, and one layout per group (style guide) means a
          stacked gadget cannot join a horizontal one anyway. Stacked and
          headed matches the brush transforms, which is what Crop is — an
          operation on the picture, not a file. Headed Size for the same reason
          the Brush drawer's first transform cluster is: it changes how big the
          thing is. */}
      <div className="drawer-menu__row">
        <GadgetCluster head="Size">
          <Gadget
            icon={<CropIcon />}
            label="Crop"
            stacked
            title="Crop the canvas — drag a box, right-click or Enter to apply"
            onClick={(): void => actions.crop.begin()}
          />
        </GadgetCluster>
      </div>
      <div className="drawer-menu__spacer" />
    </div>
  );
}
