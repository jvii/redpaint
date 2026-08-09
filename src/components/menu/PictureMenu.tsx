import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { Gadget, GadgetCluster, GadgetGroup } from './MenuGadgets';
import { icons, PixelIcon } from './pixelIcons';
import { CropIcon } from './transformIcons';
import { saveFileAs, SaveTarget, writeToHandle } from './saveAsPng';
import { blobMakerFor, SaveFormat, saveFormats } from './saveFormats';
import { fileHandleFor, rememberFileHandle } from './savedFileHandle';
import { beginSaveAsPrompt } from './pendingSaveAs';
import './DrawerMenu.css';

// The picture drawer: whole-image disk I/O — DPaint's term for the canvas as a
// whole, as opposed to a brush. Mutually exclusive with the Brush drawer
// (Menu.tsx's app.openDrawer radio group); unlike BrushMenu there's nothing to
// transform here, so it's a single File row.
//
// Two save gadgets, not one per format. Which format to write is a question the
// requester asks (SaveAsDialog) and the document then remembers, so adding GIF
// cost no gadget — where a third "Save GIF" button would have made the row a
// list of formats and still left "Save" silently meaning PNG.
export function PictureMenu({ onOpenFile }: { onOpenFile: () => void }): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  // What a save offers as the name: whatever the document is already called,
  // or the same word the tab title uses for one that is not called anything —
  // the one derived, so the two cannot drift apart. Held without an extension,
  // since the format the requester picks is what decides that.
  const baseName = state.app.displayName;

  // A written file is now what the document is: it takes that name, there is
  // nothing left unsaved, and — where the browser gave us one — the handle is
  // kept so the next plain Save can go straight back to that file.
  const remember = (format: SaveFormat, target: SaveTarget | null): void => {
    if (target === null) {
      return; // cancelled, or nothing written
    }
    rememberFileHandle(format, target.handle);
    actions.app.setSaveFormat(format);
    actions.app.setDocumentName(target.name);
    actions.app.markDocumentClean();
  };

  // Save As: ask what format (and, where nothing else will, what name), then
  // write it. The requester goes up before anything reads the canvas — a
  // cancelled save should cost nothing, and the PNG path holds the cycling
  // palette still while it captures.
  const saveAs = (): void => {
    // The menu is still open — a save is clicked from inside it — and its panel
    // is translucent and above the requesters, so leaving it up would tint this
    // one blue and swallow its clicks. Every other route into a requester
    // closes the menu the same way (ScreenStatus, crop.begin).
    actions.app.closeMenu();
    actions.app.openSaveAsPrompt(baseName);
    void (async (): Promise<void> => {
      const choice = await beginSaveAsPrompt();
      if (!choice) {
        return; // cancelled
      }
      const makeBlob = blobMakerFor(
        choice.format,
        Object.values(state.palette.palette),
        state.palette.ranges
      );
      if (!makeBlob) {
        return; // the format cannot hold this picture; blobMakerFor said so
      }
      const { fileType } = saveFormats[choice.format];
      remember(
        choice.format,
        await saveFileAs(
          makeBlob,
          `${baseName}${fileType.extension}`,
          fileType,
          // Already answered, on the branch that had to ask. The picker branch
          // passes it too and never calls it, which is why this is not a
          // condition: saveFileAs is the one that knows which route it took.
          choice.name === null ? undefined : async (): Promise<string> => choice.name as string
        )
      );
    })();
  };

  // What Save promises, which depends on whether there is anything to repeat.
  //
  // It used to say "Save as PNG, to the same file where the browser allows it"
  // — and once the format became a choice, that was wrong twice over for a
  // picture nobody has saved yet. There is no file to go back to, and the
  // format is not PNG but whatever the requester is about to ask for, since
  // that is the branch `save` falls through to. Naming a format the gadget will
  // not necessarily use is the exact confusion the requester was added to end.
  const saveTitle = (): string => {
    const format = saveFormats[state.app.saveFormat];
    if (!state.app.documentName) {
      return 'Save the picture — asks for a format and a name the first time, like Save As';
    }
    // Named, so it repeats: to the same file where the browser gave us a handle
    // for it, and otherwise to a download under the name already chosen. Either
    // way nothing is asked, which is the part worth promising.
    return `Save the picture as ${format.label} to ${baseName}${format.fileType.extension}, without asking again`;
  };

  // Plain Save: same format as last time, back to the same file with no dialog
  // where the browser allows it, and otherwise straight to a download under the
  // name already chosen. It only asks when there is nothing to repeat — a
  // document nobody has named yet, or a handle that has gone stale.
  const save = (): void => {
    const format = state.app.saveFormat;
    const makeBlob = blobMakerFor(
      format,
      Object.values(state.palette.palette),
      state.palette.ranges
    );
    if (!makeBlob) {
      return;
    }
    void (async (): Promise<void> => {
      const handle = fileHandleFor(format);
      if (handle && (await writeToHandle(handle, makeBlob))) {
        actions.app.markDocumentClean();
        return;
      }
      const { fileType } = saveFormats[format];
      if (state.app.documentName && !handle) {
        // the download branch: no handle to write to, but a name to reuse, so
        // this saves without asking again
        remember(format, await saveFileAs(makeBlob, `${baseName}${fileType.extension}`, fileType));
        return;
      }
      // Nothing to repeat, so this is a Save As after all — including the
      // format, which an unnamed document has never actually been asked about.
      saveAs();
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
            title="Open a picture..."
            onClick={onOpenFile}
          />
        </GadgetGroup>
        <GadgetGroup>
          <Gadget
            icon={<PixelIcon map={icons.diskSave} scale={2} />}
            label="Save"
            title={saveTitle()}
            onClick={save}
          />
          <Gadget
            icon={<PixelIcon map={icons.diskSave} scale={2} />}
            label="Save As"
            title="Save the picture under a new name, in a format of your choosing..."
            onClick={saveAs}
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
