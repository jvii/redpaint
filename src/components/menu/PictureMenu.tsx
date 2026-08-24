import React, { JSX } from 'react';
import { useActions, useAppState } from '../../overmind';
import { Gadget, GadgetCluster, GadgetGroup } from './MenuGadgets';
import { icons, PixelIcon } from './pixelIcons';
import {
  BgToFgIcon,
  BrushPaletteIcon,
  CopyToSpareIcon,
  CycleIcon,
  LabelArrow,
  RemapIcon,
  SwapColorsIcon,
  CropIcon,
  DeletePageIcon,
  MergeBackIcon,
  MergeFrontIcon,
  RestorePaletteIcon,
  SwapPageIcon,
} from './transformIcons';
import { brushRecall } from '../../brush/BrushRecall';
import { CustomBrush } from '../../brush/CustomBrush';
import { Color } from '../../types';
import { paletteEquals } from '../../algorithm/imageColors';
import { createPalette } from '../palette/util';
import { shortcutCap } from '../ui/shortcutCap';
import { refreshBrushPreview } from '../GlobalHotkeyManager';
import { saveFileAs, SaveTarget, writeToHandle } from './saveAsPng';
import { blobMakerFor, SaveFormat, saveFormats } from './saveFormats';
import { fileHandleFor, rememberFileHandle } from './savedFileHandle';
import { beginSaveAsPrompt } from './pendingSaveAs';
import './DrawerMenu.css';

// What From Brush would actually do, in one of three answers. Safe to read
// brushRecall directly, as BrushMenu does: every action that changes the
// current brush also closes the menu, so this remounts fresh.
//
// "matches" is the case worth naming. Every route out of the brush load
// requester leaves the brush's palette equal to the picture's — adopting the
// file's replaces the picture's with it, and remapping re-indexes the brush
// into the picture's — so straight after a load the gadget can only be a no-op.
// Left enabled it invites the click and does nothing visible; disabled, it says
// there is nothing to put back, and comes alive when the palette later drifts,
// which is the whole point of the feature (docs/brush-palette.md).
type BrushPaletteState = 'none' | 'matches' | 'differs';

function brushPaletteState(state: { paletteArray: readonly Color[] }): BrushPaletteState {
  const brush = brushRecall.current;
  if (!(brush instanceof CustomBrush) || !brush.palette) {
    return 'none';
  }
  return paletteEquals(brush.palette, state.paletteArray) ? 'matches' : 'differs';
}

// The same three answers for Restore. It is idempotent — DPaint's is a plain
// LoadCMap(prevColors), neither clearing nor swapping — so once used it would
// otherwise sit enabled re-applying the palette already showing. Dim instead,
// and live again if the palette moves away from the remembered one.
function restorePaletteState(state: {
  paletteArray: readonly Color[];
  previousPalette: Color[] | null;
}): BrushPaletteState {
  if (!state.previousPalette) {
    return 'none';
  }
  return paletteEquals(state.previousPalette, state.paletteArray) ? 'matches' : 'differs';
}

// The picture drawer: whole-image disk I/O, DPaint's term for the canvas as a
// whole, as opposed to a brush. Mutually exclusive with the Brush drawer
// (Menu.tsx's app.openDrawer radio group); unlike BrushMenu there's nothing to
// transform here, so it's a single File row.
//
// Two save gadgets, not one per format. Which format to write is a question the
// requester asks (SaveAsDialog) and the document then remembers, so adding GIF
// cost no gadget, where a third "Save GIF" button would have made the row a
// list of formats and still left "Save" silently meaning PNG.
export function PictureMenu({ onOpenFile }: { onOpenFile: () => void }): JSX.Element {
  const state = useAppState();
  const actions = useActions();
  const paletteState = brushPaletteState(state.palette);
  const restoreState = restorePaletteState(state.palette);
  // Remap only means something while the picture's pixels and the palette
  // showing them disagree — after a hand edit, a From Brush or a Default.
  const pictureMatchesPalette = paletteEquals(
    state.palette.picturePalette,
    state.palette.paletteArray
  );
  // Both color swaps are no-ops with one color selected twice.
  const sameColors = state.palette.foregroundColorId === state.palette.backgroundColorId;
  const isDefaultPalette = paletteEquals(
    Object.values(createPalette(state.palette.paletteArray.length)),
    state.palette.paletteArray
  );

  // What a save offers as the name: whatever the document is already called, or
  // the same word the tab title uses for one that is not called anything. The
  // one derived, so the two cannot drift apart. Held without an extension,
  // since the format the requester picks is what decides that.
  const baseName = state.app.displayName;

  // A written file is now what the document is: it takes that name, there is
  // nothing left unsaved, and (where the browser gave us one) the handle is
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
  // write it. The requester goes up before anything reads the canvas. A
  // cancelled save should cost nothing, and the PNG path holds the cycling
  // palette still while it captures.
  const saveAs = (): void => {
    // The menu is still open (a save is clicked from inside it), and its panel
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

  // Every Spare gadget acts on a page and then gets out of the way. The panel
  // covers the canvas, so a swap or a merge would otherwise land behind it, and
  // DPaint's own menus closed on any selection. Copy is in here too even though
  // it writes to the page you cannot see: a gadget that leaves the screen
  // exactly as it was reads as a gadget that did nothing.
  //
  // The refresh is the transform gadgets' (BrushMenu's `instant`): the pointer
  // is over the gadget, not the canvas, and the brush preview only repaints on
  // a real mouse move, so one is replayed once the close transition has
  // uncovered the canvas.
  const spareAction = (run: () => void) => (): void => {
    run();
    actions.app.closeMenu();
    setTimeout(refreshBrushPreview, 150);
  };

  // What Save promises, which depends on whether there is anything to repeat.
  // For a picture nobody has saved yet there is no file to go back to and no
  // format yet either (`save` falls through to the requester), so the tooltip
  // must not name one.
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
  // name already chosen. It only asks when there is nothing to repeat. A
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
      // Nothing to repeat, so this is a Save As after all. Including the
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
            opensFileDialog
            title="Open a picture..."
            onClick={onOpenFile}
          />
        </GadgetGroup>
        <GadgetGroup>
          <Gadget
            icon={<PixelIcon map={icons.diskSave} scale={2} />}
            label="Save"
            opensFileDialog
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
        {/* DPaint's own Pict-menu grouping, kept as a head of its own because
            Copy To Spare and the two merges join it. "Spare" is positional —
            always the page you are not on — so the gadget swaps rather than
            going anywhere named. */}
        <GadgetCluster head="Spare">
          <Gadget
            icon={<SwapPageIcon />}
            label="Swap"
            stacked
            shortcut={shortcutCap('j')}
            title="Show the other page. Tools, brush and palette come with you; the background color belongs to the page"
            onClick={spareAction((): void => actions.pages.swap())}
          />
          <Gadget
            icon={<CopyToSpareIcon />}
            label="Copy"
            stacked
            shortcut={shortcutCap('J')}
            title="Copy this page onto the other one, replacing what is there — somewhere to try something without risking the picture"
            onClick={spareAction((): void => actions.pages.copyToSpare())}
          />
          <Gadget
            icon={<DeletePageIcon />}
            label="Delete"
            stacked
            // Nothing to fall back to with a single page, and a document
            // always has one.
            disabled={state.pages.pageCount < 2}
            title="Delete the page you are on and show the other one. Its history goes with it"
            // Closes the menu first, as every other route into a requester
            // does: the panel is translucent and sits above them, so it would
            // tint this one blue and swallow its clicks.
            onClick={(): void => {
              actions.app.closeMenu();
              actions.dialog.open('DELETE_PAGE');
            }}
          />
          {/* The merges sit on the same strip: everything here is an operation
              on the other page, and a second head would have split that into
              two ideas. Labelled by where the other page lands rather than
              "Merge Front" — the head already says Spare, the glyphs show the
              layering, and the longer wording makes the strip wider than the
              panel at the default window size. */}
          <Gadget
            icon={<MergeFrontIcon />}
            label="Front"
            stacked
            disabled={state.pages.pageCount < 2}
            title="Merge the other page in front of this one, its background color reading as transparent"
            onClick={spareAction((): void => actions.pages.mergeFront())}
          />
          <Gadget
            icon={<MergeBackIcon />}
            label="Back"
            stacked
            disabled={state.pages.pageCount < 2}
            title="Merge the other page behind this one, showing through wherever this page is background color"
            onClick={spareAction((): void => actions.pages.mergeBack())}
          />
        </GadgetCluster>
        {/* DPaint's Picture > Color control pair. A brush holds palette
            indices, so changing the palette recolors it; this moves the
            picture's palette to the brush rather than the brush to the
            palette. The picture's own pixels are indices too and recolor with
            it — which is what Restore is for. */}
        <GadgetCluster head="Palette">
          <Gadget
            icon={<BrushPaletteIcon />}
            label="Default"
            stacked
            disabled={isDefaultPalette}
            title={
              isDefaultPalette
                ? 'This is already the default palette for its number of colors'
                : 'Back to the built-in palette for this number of colors. Restore puts the current one back'
            }
            onClick={(): void => {
              actions.palette.defaultPalette();
              actions.app.closeMenu();
            }}
          />
          <Gadget
            icon={<BrushPaletteIcon />}
            label="From Brush"
            stacked
            disabled={paletteState !== 'differs'}
            title={
              paletteState === 'differs'
                ? "Give the picture the palette the current brush was made under, so the brush's colors read as they did"
                : paletteState === 'matches'
                  ? 'The brush already matches the picture\u2019s palette'
                  : 'The current brush carries no palette of its own'
            }
            onClick={(): void => {
              actions.palette.useBrushPalette();
              actions.app.closeMenu();
            }}
          />
          <Gadget
            icon={<RestorePaletteIcon />}
            label="Restore"
            stacked
            disabled={restoreState !== 'differs'}
            // Says what it costs, not just what it does. It installs the
            // palette that was in use before a brush's displaced it, whatever
            // has happened to the palette since — so after a hand edit it is
            // not the undo of From Brush the shorter wording implied, it also
            // drops the edit. (One undo brings that back: a palette editor
            // session commits an undo point and an undo entry carries the
            // palette. But the tooltip should not need that to be true.)
            title={
              restoreState === 'differs'
                ? 'Go back to the palette that was in use before From Brush or Default replaced it, dropping any palette changes made since'
                : restoreState === 'matches'
                  ? 'That palette is already back'
                  : 'No palette has been replaced yet'
            }
            onClick={(): void => {
              actions.palette.restorePalette();
              actions.app.closeMenu();
            }}
          />
        </GadgetCluster>
        {/* The picture-wide twins of the Brush drawer's Recolor cluster, and
            DPaint II's own additions to this submenu. Same glyphs, since it is
            the same operation on a different subject — but each changes pixels,
            so each is one undo step, where the brush versions bank for
            Restore.

            Recolor rather than Color, beside a cluster called Palette: the two
            are the halves of this app's whole colour model, and "Color" next to
            "Palette" named neither of them. Palette changes which colors exist
            and leaves the picture's indices alone; Recolor changes what those
            indices point at and leaves the palette alone. The palette strip in
            Remap's glyph reads as "against the palette" under that head, rather
            than as a fourth palette operation. */}
        <GadgetCluster head="Recolor">
          <Gadget
            icon={<BgToFgIcon />}
            label={
              <>
                Bg
                <LabelArrow />
                Fg
              </>
            }
            stacked
            disabled={sameColors}
            title={
              sameColors
                ? 'The foreground and background colors are the same'
                : 'Repaint every background-colored pixel in the foreground color'
            }
            onClick={(): void => {
              actions.canvas.pictureBackgroundToForeground();
              actions.app.closeMenu();
            }}
          />
          <Gadget
            icon={<SwapColorsIcon />}
            label={
              <>
                Bg
                <LabelArrow both />
                Fg
              </>
            }
            stacked
            disabled={sameColors}
            title={
              sameColors
                ? 'The foreground and background colors are the same'
                : 'Exchange the foreground and background colors throughout the picture'
            }
            onClick={(): void => {
              actions.canvas.pictureSwapBackgroundAndForeground();
              actions.app.closeMenu();
            }}
          />
          <Gadget
            icon={<RemapIcon />}
            label="Remap"
            stacked
            disabled={pictureMatchesPalette}
            title={
              pictureMatchesPalette
                ? 'The picture is already indexed against this palette'
                : 'Re-index the picture into the current palette, so it keeps its colors rather than its slots'
            }
            onClick={(): void => {
              actions.canvas.remapPictureToPalette();
              actions.app.closeMenu();
            }}
          />
        </GadgetCluster>
        {/* Its own cluster, unheaded: it belongs to neither of the two beside
            it. Palette changes which colors exist and Recolor what the picture
            points at, where this changes neither — it animates the ranges and
            paints nothing. Last on the row, and named in full here because the
            head that would have said "Color" is the one it does without. */}
        <GadgetCluster>
          <Gadget
            icon={<CycleIcon />}
            label="Color Cycling"
            stacked
            shortcut={shortcutCap('Tab')}
            on={state.palette.cyclingOn}
            title="Animate the palette ranges, rotating each range's colors. Display only — it paints nothing"
            onClick={(): void => {
              actions.palette.toggleCycling();
              actions.app.closeMenu();
            }}
          />
        </GadgetCluster>
      </div>
      <div className="drawer-menu__spacer" />
    </div>
  );
}
