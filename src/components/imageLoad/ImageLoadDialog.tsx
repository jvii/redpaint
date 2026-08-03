import { JSX, useEffect, useRef, useState } from 'react';
import './ImageLoadDialog.css';
import { useActions, useAppState } from '../../overmind';
import { peekPendingImage, takePendingImage } from '../../canvas/pendingImage';
import { setPendingCanvasContent } from '../../canvas/pendingCanvasContent';
import { CanvasColorIndex } from '../../domain/CanvasColorIndex';
import {
  extractExactPalette,
  mapToPalette,
  mapToPaletteExact,
  medianCutPalette,
} from '../../algorithm/quantize';
import { paintingCanvasController } from '../../canvas/paintingCanvas/PaintingCanvasController';
import { overlayCanvasController } from '../../canvas/overlayCanvas/OverlayCanvasController';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroToggle } from '../ui/RetroToggle';
import { RetroFieldset } from '../ui/RetroFieldset';
import { LoadPreview } from './LoadPreview';
import { drawLoadPreview } from './drawLoadPreview';
import { plainPalette } from '../../algorithm/imageColors';
import { undoLevelsForCanvas, MAX_UNDO_ENTRIES } from '../../overmind/undo/UndoBuffer';

// How the loaded image's colors are treated (the image always loads at its
// own size — resizing is the screen format's business):
//  - 'true':    every pixel a true-color pixel, palette untouched (the hybrid
//               mode; today's behavior)
//  - 'new':     quantize to a new palette extracted from the image and index
//               every pixel against it — the browser-era version of DPaint
//               loading a picture's palette with the picture
//  - 'current': index against the existing palette, nearest color per pixel;
//               the palette is untouched
type ColorMode = 'true' | 'new' | 'current';

const COUNT_OPTIONS = [2, 4, 8, 16, 32, 64, 128, 256].map((n) => ({
  value: String(n),
  label: String(n),
}));

// Below this many levels of history, a big image is worth mentioning before it
// loads. Deliberately well under MAX_UNDO_ENTRIES rather than at it: the byte
// budget starts trimming somewhere around a 1024x768 image, which is nobody's
// idea of large and would make this a permanent nag. 25 levels lands the notice
// at roughly 2.5 megapixels, which is also about where the per-stroke cost
// starts to be felt (~0.6 ms per megapixel per brush stamp, measured).
const ADVISE_BELOW_UNDO_LEVELS = 25;

export function ImageLoadDialog(): JSX.Element | null {
  const state = useAppState();

  if (state.dialog.activeDialog !== 'IMAGE_LOAD' || !state.app.imageLoadInfo) {
    return null;
  }
  // remounts on every open, so the draft state below starts fresh
  return <ImageLoadDialogOpen />;
}

function ImageLoadDialogOpen(): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  // presence checked by the wrapper
  const info = state.app.imageLoadInfo as NonNullable<typeof state.app.imageLoadInfo>;
  // an image whose colors fit a palette can be indexed exactly — no
  // quantization loss at all — so suggest the smallest depth that holds it
  const fitsPalette = info.colorCount <= 256;
  const smallestSufficient = COUNT_OPTIONS.map((option) => Number(option.value)).find(
    (n) => n >= info.colorCount
  );

  const [mode, setMode] = useState<ColorMode>('true');
  const [count, setCount] = useState(smallestSufficient ?? 256);

  // A big image loads at its own size and is never refused — someone wanting to
  // paint on a photo for fun is welcome to. But it costs, in ways that are
  // invisible until they bite (strokes get slower, history stops going as far
  // back), so say so up front while OK/Cancel is still on screen.
  const undoLevels = undoLevelsForCanvas(info.width, info.height);
  const megapixels = (info.width * info.height) / 1_000_000;

  // One preview showing the image as the draft treatment would load it — the
  // same palette and mapping OK would commit, re-rendered when the mode or
  // depth changes (True Color shows the original). Drawn at native size and
  // scaled by CSS with image-rendering: pixelated — the canvas's own display
  // trick. Tiny images upscale by a whole factor so their pixels stay even;
  // large ones shrink fractionally, which a preview can afford.
  const previewRef = useRef<HTMLCanvasElement>(null);
  useEffect((): void => {
    const image = peekPendingImage();
    if (mode === 'true') {
      drawLoadPreview(previewRef.current, image); // loads verbatim
      return;
    }
    if (!image) {
      return;
    }
    const exact = mode === 'new' && info.colorCount <= count;
    const palette =
      mode === 'new'
        ? exact
          ? extractExactPalette(image.data, count)
          : medianCutPalette(image.data, count)
        : plainPalette(state.palette.paletteArray);
    const indices = exact
      ? mapToPaletteExact(image.data, palette)
      : mapToPalette(image.data, palette);
    drawLoadPreview(previewRef.current, image, (_data, i) => palette[indices[i / 4]]);
  }, [mode, count]);

  const handleCancel = (): void => {
    takePendingImage();
    actions.app.clearImageLoadInfo();
    actions.dialog.close();
  };

  const handleOk = (): void => {
    const image = takePendingImage();
    if (!image) {
      handleCancel();
      return;
    }

    // the load is a new document, so its color choice decides the True Color
    // mode outright: a True Color load opts in, an indexed load opts out —
    // whatever the previous document had chosen
    actions.canvas.setTrueColorEnabled(mode === 'true');

    let colorIndex: CanvasColorIndex;
    if (mode === 'true') {
      colorIndex = CanvasColorIndex.fromImageData(image);
    } else if (mode === 'new') {
      const exact = info.colorCount <= count;
      const palette = exact
        ? extractExactPalette(image.data, count)
        : medianCutPalette(image.data, count);
      const indices = exact
        ? mapToPaletteExact(image.data, palette)
        : mapToPalette(image.data, palette);
      colorIndex = CanvasColorIndex.fromIndexedPixels(image.width, image.height, indices);
      actions.palette.replacePalette(palette);
      // the GL palette textures don't watch Overmind — push the new palette
      paintingCanvasController.updatePalette();
      overlayCanvasController.updatePalette();
    } else {
      // plain copies: mapToPalette reads r/g/b once per histogram bin times
      // palette length, which is no place for proxied state objects
      const palette = plainPalette(state.palette.paletteArray);
      const indices = mapToPalette(image.data, palette);
      colorIndex = CanvasColorIndex.fromIndexedPixels(image.width, image.height, indices);
    }

    // the canvas resizes to the image; the resolution effect uploads the
    // queued content once the resize commits, and — as a fresh document —
    // resets the undo history to it
    setPendingCanvasContent(colorIndex, { freshDocument: true });
    actions.canvas.setResolution({
      width: image.width,
      height: image.height,
      recordUndoPoint: false,
    });
    actions.app.clearImageLoadInfo();
    actions.dialog.close();
  };

  return (
    <Modal header="Load Image" width={760}>
      <div className="image-load__body">
        <LoadPreview
          label="Image"
          width={info.width}
          height={info.height}
          colorCount={info.colorCount}
          exactNote={fitsPalette ? 'fits a palette exactly' : undefined}
          canvasRef={previewRef}
        />
        {/* directly under the size it is talking about, and above the fold: the
            body scrolls on a short window, and a notice you have to scroll to
            find is not a notice */}
        {undoLevels < ADVISE_BELOW_UNDO_LEVELS && (
          <p className="image-load__advisory">
            {megapixels.toFixed(1)} megapixels. Painting will be slower at this size, and undo will
            hold about {undoLevels} steps instead of {MAX_UNDO_ENTRIES}.
          </p>
        )}
        <RetroFieldset legend="Colors">
          <RetroToggle
            variant="column"
            options={[
              { value: 'true', label: 'True Color (Original)' },
              { value: 'new', label: 'New Palette From Image' },
              {
                value: 'current',
                label: `Remap To Current Palette (${state.palette.paletteArray.length})`,
              },
            ]}
            value={mode}
            onChange={(value): void => setMode(value as ColorMode)}
          />
        </RetroFieldset>
        <RetroFieldset legend="Indexed Palette Size" className="image-load__count">
          <RetroToggle
            variant="grid"
            columns={4}
            options={COUNT_OPTIONS}
            value={String(count)}
            onChange={(value): void => setCount(Number(value))}
            disabled={mode !== 'new'}
          />
        </RetroFieldset>
      </div>
      <RetroButton variant="secondary" onClick={handleCancel}>
        Cancel
      </RetroButton>
      <RetroButton variant="primary" onClick={handleOk}>
        OK
      </RetroButton>
    </Modal>
  );
}
