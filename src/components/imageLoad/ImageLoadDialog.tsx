import { JSX, useState } from 'react';
import './ImageLoadDialog.css';
import { useActions, useAppState } from '../../overmind';
import { takePendingImage } from '../../canvas/pendingImage';
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

    let colorIndex: CanvasColorIndex;
    if (mode === 'true') {
      colorIndex = CanvasColorIndex.fromImageData(image);
      // a new document loaded as True Color opts back into true color, even
      // if the previous document had switched it off
      actions.canvas.setTrueColorEnabled(true);
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
      const palette = state.palette.paletteArray.map((c) => ({ r: c.r, g: c.g, b: c.b }));
      const indices = mapToPalette(image.data, palette);
      colorIndex = CanvasColorIndex.fromIndexedPixels(image.width, image.height, indices);
    }

    // the canvas resizes to the image; the resolution effect uploads the
    // queued content once the resize commits, and — as a fresh document —
    // resets the undo history to it
    setPendingCanvasContent(colorIndex, { freshDocument: true });
    actions.canvas.setResolution({ width: image.width, height: image.height, recordUndoPoint: false });
    actions.app.clearImageLoadInfo();
    actions.dialog.close();
  };

  return (
    <Modal header="Load Image" width={640}>
      <div className="image-load__body">
        <div className="image-load__info">
          <span className="image-load__info-label">Image</span>
          {`${info.width}x${info.height}`} &middot; <b>{info.colorCount.toLocaleString('en-US')}</b>{' '}
          {info.colorCount === 1 ? 'color' : 'colors'}
          {fitsPalette && <span className="image-load__exact"> &mdash; fits a palette exactly</span>}
        </div>
        <fieldset className="image-load__mode">
          <legend>Colors</legend>
          <RetroToggle
            variant="column"
            options={[
              { value: 'true', label: 'True Color' },
              { value: 'new', label: 'New palette from image' },
              { value: 'current', label: `Current palette (${state.palette.paletteArray.length})` },
            ]}
            value={mode}
            onChange={(value): void => setMode(value as ColorMode)}
          />
        </fieldset>
        <fieldset className="image-load__count">
          <legend>Palette size</legend>
          <RetroToggle
            variant="grid"
            columns={4}
            options={COUNT_OPTIONS}
            value={String(count)}
            onChange={(value): void => setCount(Number(value))}
            disabled={mode !== 'new'}
          />
        </fieldset>
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
