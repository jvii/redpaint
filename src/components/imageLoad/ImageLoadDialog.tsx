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

  // Previews of the decoded pixels — the original, and beside it the chosen
  // treatment applied live, an arrow between them. Both drawn at native size
  // and scaled by CSS with image-rendering: pixelated — the same display
  // trick the canvas itself uses. Tiny images upscale by a whole factor so
  // their pixels stay even; large ones shrink fractionally, which a preview
  // can afford.
  const previewRef = useRef<HTMLCanvasElement>(null);
  useEffect((): void => {
    const image = peekPendingImage();
    const canvas = previewRef.current;
    if (!image || !canvas) {
      return;
    }
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext('2d')?.putImageData(image, 0, 0);
  }, []);

  // The treated side re-renders when the draft changes: the same palette and
  // mapping the OK would commit, applied to the full image (cheap enough at
  // typical sizes; the histogram passes dominate and are single-pass).
  const treatedRef = useRef<HTMLCanvasElement>(null);
  useEffect((): void => {
    const image = peekPendingImage();
    const canvas = treatedRef.current;
    if (!image || !canvas) {
      return;
    }
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    if (mode === 'true') {
      ctx.putImageData(image, 0, 0); // loads verbatim
      return;
    }
    const exact = mode === 'new' && info.colorCount <= count;
    const palette =
      mode === 'new'
        ? exact
          ? extractExactPalette(image.data, count)
          : medianCutPalette(image.data, count)
        : state.palette.paletteArray.map((c) => ({ r: c.r, g: c.g, b: c.b }));
    const indices = exact
      ? mapToPaletteExact(image.data, palette)
      : mapToPalette(image.data, palette);
    const out = ctx.createImageData(image.width, image.height);
    for (let p = 0, i = 0; p < indices.length; p++, i += 4) {
      const color = palette[indices[p]];
      out.data[i] = color.r;
      out.data[i + 1] = color.g;
      out.data[i + 2] = color.b;
      out.data[i + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
  }, [mode, count]);

  const PREVIEW_MAX_W = 250;
  const PREVIEW_MAX_H = 170;
  let previewScale = Math.min(PREVIEW_MAX_W / info.width, PREVIEW_MAX_H / info.height);
  if (previewScale >= 1) {
    previewScale = Math.max(1, Math.floor(previewScale));
  }
  const previewStyle = {
    width: Math.round(info.width * previewScale),
    height: Math.round(info.height * previewScale),
  };

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
        <div className="image-load__top">
          <div className="image-load__info">
            <span className="image-load__info-label">Image</span>
            {`${info.width}x${info.height}`} &middot;{' '}
            <b>{info.colorCount.toLocaleString('en-US')}</b>{' '}
            {info.colorCount === 1 ? 'color' : 'colors'}
            {fitsPalette && (
              <span className="image-load__exact"> &mdash; fits a palette exactly</span>
            )}
          </div>
          <div className="image-load__previews">
            <canvas ref={previewRef} className="image-load__preview" style={previewStyle} />
            {/* pixel-art arrow, drawn like the toolbox icons */}
            <svg
              className="image-load__arrow"
              viewBox="0 0 12 12"
              aria-hidden="true"
              focusable="false"
            >
              <rect x="1" y="5" width="7" height="2" />
              <rect x="6" y="2" width="2" height="1" />
              <rect x="7" y="3" width="2" height="1" />
              <rect x="8" y="4" width="2" height="1" />
              <rect x="9" y="5" width="2" height="2" />
              <rect x="8" y="7" width="2" height="1" />
              <rect x="7" y="8" width="2" height="1" />
              <rect x="6" y="9" width="2" height="1" />
            </svg>
            <canvas ref={treatedRef} className="image-load__preview" style={previewStyle} />
          </div>
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
          <legend>Indexed palette size</legend>
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
