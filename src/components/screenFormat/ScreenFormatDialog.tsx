import { JSX, useState } from 'react';
import './ScreenFormatDialog.css';
import { useActions, useAppState } from '../../overmind';
import {
  ScreenFormatId,
  VideoStandard,
  resolveScreenFormat,
  screenFormats,
} from '../../overmind/canvas/state';
import { PaletteSource } from '../../overmind/canvas/actions';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroToggle } from '../ui/RetroToggle';
import { RetroFieldset } from '../ui/RetroFieldset';

// 'Native' is the no-simulation state (screenFormatId === null): the
// page is shown 1:1 in the window, no Amiga screen scaling — the startup mode.
const NATIVE = 'native';
type FormatChoice = ScreenFormatId | typeof NATIVE;

// Depends on the draft videoStandard (PAL/NTSC), so it's a function of it
// rather than a static list — the same 4 formats mean different pixel sizes
// per standard (see resolveScreenFormat).
function formatOptions(videoStandard: VideoStandard) {
  return [
    { value: NATIVE, label: 'Native' },
    ...Object.values(screenFormats).map((format) => {
      const { width, height } = resolveScreenFormat(format.id, videoStandard);
      return {
        value: format.id,
        // name on the left, resolution right-aligned on the same row (the
        // segment is laid out as a flex row in CSS)
        label: (
          <>
            <span className="screen-format__format-name">{format.name}</span>
            <span className="screen-format__format-res toggle-detail">
              {width}×{height}
            </span>
          </>
        ),
      };
    }),
  ];
}

// DPaint II offered 2..32 (the Amiga's bitplane depths); 64/128/256 are ours
const COLOR_OPTIONS = [2, 4, 8, 16, 32, 64, 128, 256].map((colors) => ({
  value: String(colors),
  label: String(colors),
}));

export function ScreenFormatDialog(): JSX.Element | null {
  const state = useAppState();

  if (state.dialog.activeDialog !== 'SCREEN_FORMAT') {
    return null;
  }
  // remounts on every open, so the draft state below starts fresh each time
  return <ScreenFormatDialogOpen />;
}

function ScreenFormatDialogOpen(): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  // Draft selections, applied only on OK (Cancel changes nothing).
  const [formatId, setFormatId] = useState<FormatChoice>(state.canvas.screenFormatId ?? NATIVE);
  const isNative = formatId === NATIVE;
  const [videoStandard, setVideoStandard] = useState<VideoStandard>(state.canvas.videoStandard);
  // Sizes are always a power of two between 2 and 256 (every path that builds a
  // palette produces one), so this is a real option on the row below — the
  // fallback is for a document that somehow arrived with a size that is not.
  const currentPaletteSize = COLOR_OPTIONS.some(
    (option) => Number(option.value) === state.palette.paletteArray.length
  )
    ? state.palette.paletteArray.length
    : 32;
  const [colors, setColors] = useState(currentPaletteSize);
  // Whether the document allows true-color pixels. Switching it off (with OK)
  // conforms the canvas to the palette — the explicit color-reducing move.
  const [trueColorEnabled, setTrueColorEnabled] = useState(state.canvas.trueColorEnabled);
  // Where a reduction takes its palette from (see PaletteSource). Only
  // meaningful when the draft actually reduces colors, so the toggle below is
  // disabled otherwise.
  //
  // From the image by default. "Current Palette" means the palette exactly as
  // it stands, which is only a thing you can remap to at its own size — at any
  // other size it was neither: growing filled the new slots from the default
  // ramp, so picking 256 against a 32-color document produced 32 colors of
  // yours and 224 nobody had chosen, and the picture then mapped onto those
  // too. An option named Current Palette must not be able to invent colors.
  const [paletteSource, setPaletteSource] = useState<PaletteSource>('image');

  // Whether the picture survives the change, DPaint-style: choosing a screen
  // was a way of starting a picture, not of converting the one you had. No by
  // default for that reason — and because conforming a picture to a screen it
  // was not drawn for is the more deliberate of the two acts, so it is the one
  // worth asking for. Either way it is a single undo away.
  const [retainPicture, setRetainPicture] = useState(false);

  // The two controls keep each other honest instead of one greying the other
  // out: choosing a size that is not the palette's moves the remap to the image
  // (the only source that can supply that size), and choosing Current Palette
  // moves the size back to the palette's own. Either way the pair stays a
  // combination that means something, and neither control ever goes dead.
  const chooseColors = (count: number): void => {
    setColors(count);
    if (count !== currentPaletteSize) {
      setPaletteSource('image');
    }
  };
  const choosePaletteSource = (source: PaletteSource): void => {
    setPaletteSource(source);
    if (source === 'current') {
      setColors(currentPaletteSize);
    }
  };
  const reducesColors =
    colors < state.palette.paletteArray.length ||
    (!trueColorEnabled && state.canvas.hasTrueColorPixels);
  // Where a palette comes from is only a question while there is a picture to
  // keep: a discarded one has no pixels to remap and, for "From Image", no
  // image to take a palette from either.
  const canRemap = retainPicture && reducesColors;

  const handleOk = (): void => {
    const resolvedFormatId = isNative ? null : formatId;
    // Native has no page size of its own, so it keeps the canvas it has.
    const target = isNative
      ? state.canvas.resolution
      : resolveScreenFormat(formatId as ScreenFormatId, videoStandard);

    // Not keeping the picture: apply the format, then put a blank canvas at
    // the new size. No conform (applyScreenFormat skips it) and no shrink
    // question either — that question exists to protect pixels from being
    // cropped away, and these are going regardless. One undo entry, recorded
    // by the upload, covers the format change and the blank canvas together.
    if (!retainPicture) {
      actions.canvas.applyScreenFormat({
        formatId: resolvedFormatId,
        videoStandard,
        colors,
        trueColorEnabled,
        paletteSource,
        retainPicture: false,
      });
      actions.canvas.resizeCanvasClearingContent(target);
      actions.dialog.close();
      return;
    }

    // Native has no page size, so it keeps the current canvas as-is (shown 1:1).
    if (isNative) {
      const conformed = actions.canvas.applyScreenFormat({
        formatId: null,
        videoStandard,
        colors,
        trueColorEnabled,
        paletteSource,
        retainPicture: true,
      });
      if (conformed) {
        actions.undo.setUndoPoint();
      }
      actions.dialog.close();
      return;
    }

    // An Amiga format fits the canvas to its dimensions. Growing (or an equal
    // size) anchors the existing pixels top-left at 1:1 — nothing is lost, so
    // commit straight away. Shrinking in either dimension would crop, so hold
    // the *whole* change unapplied and ask; that way Cancel undoes nothing
    // (reverting a narrowed palette would lose the dropped colors for good).
    const current = state.canvas.resolution;
    const sameSize = target.width === current.width && target.height === current.height;
    const wouldShrink = target.width < current.width || target.height < current.height;

    if (wouldShrink) {
      actions.canvas.setPendingScreenFormat({
        formatId: resolvedFormatId,
        videoStandard,
        colors,
        trueColorEnabled,
        paletteSource,
        target,
      });
      actions.dialog.open('SCREEN_RESIZE');
      return;
    }

    const conformed = actions.canvas.applyScreenFormat({
      formatId: resolvedFormatId,
      videoStandard,
      colors,
      trueColorEnabled,
      paletteSource,
      retainPicture: true,
    });
    if (!sameSize) {
      // one history entry for the whole change, via the resize upload — which
      // picks up the conformed pixels, if any
      actions.canvas.resizeCanvasPlacingContent(target);
    } else if (conformed) {
      actions.undo.setUndoPoint();
    }
    actions.dialog.close();
  };

  return (
    <Modal header="Set Screen Format" width={1140}>
      <div className="screen-format__body">
        <div className="screen-format__left">
          <RetroFieldset legend="Resolution" className="screen-format__formats" as="div">
            <RetroToggle
              variant="column"
              options={formatOptions(videoStandard)}
              value={formatId}
              onChange={(value): void => setFormatId(value as FormatChoice)}
            />
          </RetroFieldset>
          {/* which broadcast standard the 4 named formats above resolve
              to — a real Amiga only ran one at a time */}
          <div className="screen-format__standard">
            <RetroToggle
              variant="grid"
              columns={2}
              options={[
                { value: 'PAL', label: 'PAL' },
                { value: 'NTSC', label: 'NTSC' },
              ]}
              value={videoStandard}
              onChange={(value): void => setVideoStandard(value as VideoStandard)}
            />
          </div>
        </div>
        {/* as="div" on every group here, not a real <fieldset>. A <legend> is
            laid out specially rather than as an ordinary child, so a group's
            intrinsic width does not reliably include it — which is exactly
            what the min-width: max-content rule in the stylesheet asks for,
            and Chrome happened to grant. Safari did not: enabling or disabling
            the Remap To toggle re-measured the fieldset and moved the column
            and the requester with it. FillStyleSettings switched to divs for
            its own Safari fieldset bug; nothing here wants native fieldset
            disabling either, since every control takes an explicit prop. */}
        <div className="screen-format__right">
          <RetroFieldset legend="Indexed Palette Size" className="screen-format__colors" as="div">
            <RetroToggle
              variant="grid"
              columns={4}
              options={COLOR_OPTIONS}
              value={String(colors)}
              onChange={(value): void => chooseColors(Number(value))}
            />
          </RetroFieldset>
          <RetroFieldset legend="True Color" className="screen-format__truecolor" as="div">
            {/* off conforms the canvas to the palette on OK (flattening any
                true-color pixels); loading an image as True Color re-enables */}
            <RetroToggle
              variant="grid"
              columns={2}
              options={[
                { value: 'on', label: 'On' },
                { value: 'off', label: 'Off' },
              ]}
              value={trueColorEnabled ? 'on' : 'off'}
              onChange={(value): void => setTrueColorEnabled(value === 'on')}
            />
          </RetroFieldset>
        </div>
        {/* The picture's own fate, and the setting that only matters when it
            has one — so Remap To sits under Retain Picture rather than under
            the palette controls it used to follow. */}
        <div className="screen-format__picture">
          <RetroFieldset legend="Retain Picture" className="screen-format__retain" as="div">
            <RetroToggle
              variant="grid"
              columns={2}
              options={[
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
              value={retainPicture ? 'yes' : 'no'}
              onChange={(value): void => setRetainPicture(value === 'yes')}
            />
          </RetroFieldset>
          <RetroFieldset legend="Remap To" className="screen-format__remap" as="div">
            {/* only a reduction remaps: fewer colors, or True Color going off.
                Current Palette carries a size because its size is not the one
                selected above — it is the one option whose size is not a
                choice. The other option needs no number: it produces whatever
                Indexed Palette Size says, which is on screen directly above. */}
            <RetroToggle
              variant="column"
              options={[
                { value: 'current', label: `Current Palette (${currentPaletteSize})` },
                { value: 'image', label: 'New Palette From Image' },
              ]}
              value={paletteSource}
              onChange={(value): void => choosePaletteSource(value as PaletteSource)}
              disabled={!canRemap}
            />
          </RetroFieldset>
        </div>
      </div>
      <RetroButton variant="secondary" onClick={actions.dialog.close}>
        Cancel
      </RetroButton>
      <RetroButton variant="primary" onClick={handleOk}>
        OK
      </RetroButton>
    </Modal>
  );
}
