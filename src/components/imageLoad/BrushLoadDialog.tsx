import { JSX, useEffect, useRef, useState } from 'react';
import './BrushLoadDialog.css';
import { useActions, useAppState } from '../../overmind';
import { peekPendingBrush, takePendingBrush } from '../../canvas/pendingBrush';
import { BrushColorIndex } from '../../domain/BrushColorIndex';
import { distinctOpaqueColorsByFrequency } from '../../algorithm/imageColors';
import { remapColorsGreedy } from '../../algorithm/quantize';
import { CustomBrush } from '../../brush/CustomBrush';
import { brushRecall } from '../../brush/BrushRecall';
import { Color } from '../../types';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroToggle } from '../ui/RetroToggle';
import { RetroFieldset } from '../ui/RetroFieldset';
import { LoadPreview } from './LoadPreview';

// The greedy remap (see remapColorsGreedy) as a 24-bit-RGB -> palette-index
// lookup, shared by the live preview and the actual commit in handleOk.
function remapToIndexByColor(image: ImageData, palette: Color[]): Map<number, number> {
  const distinct = distinctOpaqueColorsByFrequency(image.data);
  const assigned = remapColorsGreedy(distinct, palette);
  const indexByColor = new Map<number, number>();
  distinct.forEach(({ color }, i) => {
    indexByColor.set((color.r << 16) | (color.g << 8) | color.b, assigned[i]);
  });
  return indexByColor;
}

// How the loaded brush's colors are treated — simpler than image loading's
// three-way choice, since a brush never carries a palette of its own into the
// document (only "new palette from image" needs that):
//  - 'true':    every opaque pixel a true-color pixel, matching today's
//               (only) behavior
//  - 'current': indexed against the existing palette, DPaint's REMAP.C-style
//               greedy assignment (see remapColorsGreedy) rather than a plain
//               per-pixel nearest-color search — a brush usually has few
//               distinct colors, so they're worth keeping distinct on the
//               palette instead of collapsing onto the same nearest slot
type ColorMode = 'true' | 'current';

export function BrushLoadDialog(): JSX.Element | null {
  const state = useAppState();

  if (state.dialog.activeDialog !== 'BRUSH_LOAD' || !state.app.brushLoadInfo) {
    return null;
  }
  // remounts on every open, so the draft state below starts fresh
  return <BrushLoadDialogOpen />;
}

function BrushLoadDialogOpen(): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  // presence checked by the wrapper
  const info = state.app.brushLoadInfo as NonNullable<typeof state.app.brushLoadInfo>;
  const fitsPalette = info.colorCount <= state.palette.paletteArray.length;

  const [mode, setMode] = useState<ColorMode>('true');

  // One preview showing the brush as the draft treatment would load it,
  // re-rendered when the mode changes (True Color shows the original).
  // Transparent pixels stay transparent regardless of mode — the checker
  // background shows through, same idiom as the image load preview.
  const previewRef = useRef<HTMLCanvasElement>(null);
  useEffect((): void => {
    const image = peekPendingBrush();
    const canvas = previewRef.current;
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
      ctx.putImageData(image, 0, 0);
      return;
    }
    const palette = state.palette.paletteArray.map((c) => ({ r: c.r, g: c.g, b: c.b }));
    const indexByColor = remapToIndexByColor(image, palette);
    const out = ctx.createImageData(image.width, image.height);
    for (let p = 0, i = 0; i < image.data.length; p++, i += 4) {
      const alpha = image.data[i + 3];
      if (alpha < 128) {
        continue; // transparent, out stays zero-filled (alpha 0)
      }
      const rgb = (image.data[i] << 16) | (image.data[i + 1] << 8) | image.data[i + 2];
      const color = palette[indexByColor.get(rgb) ?? 0];
      out.data[i] = color.r;
      out.data[i + 1] = color.g;
      out.data[i + 2] = color.b;
      out.data[i + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
  }, [mode]);

  const handleCancel = (): void => {
    takePendingBrush();
    actions.app.clearBrushLoadInfo();
    actions.dialog.close();
  };

  const handleOk = (): void => {
    const image = takePendingBrush();
    if (!image) {
      handleCancel();
      return;
    }

    let colorIndex: BrushColorIndex;
    if (mode === 'true') {
      colorIndex = BrushColorIndex.fromImageData(image);
    } else {
      const palette = state.palette.paletteArray.map((c) => ({ r: c.r, g: c.g, b: c.b }));
      colorIndex = BrushColorIndex.fromRemappedImageData(
        image,
        remapToIndexByColor(image, palette)
      );
    }

    brushRecall.setCustom(new CustomBrush(colorIndex, image.width, image.height));
    actions.brush.clearBuiltInBrushSelection();
    actions.brush.setMode('Matte');
    actions.brush.refreshPreviousBrushSlot();
    // DPaint switches to (dotted) freehand after loading a brush — matches
    // the brush selector tool's own switch after capturing one.
    actions.toolbox.setSelectedDrawingTool('dottedFreehand');

    actions.app.clearBrushLoadInfo();
    actions.dialog.close();
  };

  return (
    <Modal header="Load Brush" width={760}>
      <div className="brush-load__body">
        <LoadPreview
          label="Brush"
          width={info.width}
          height={info.height}
          colorCount={info.colorCount}
          exactNote={fitsPalette ? 'fits the palette exactly' : undefined}
          canvasRef={previewRef}
        />
        <RetroFieldset legend="Colors">
          <RetroToggle
            variant="column"
            options={[
              { value: 'true', label: 'True Color (Original)' },
              {
                value: 'current',
                label: `Remap To Current Palette (${state.palette.paletteArray.length})`,
              },
            ]}
            value={mode}
            onChange={(value): void => setMode(value as ColorMode)}
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
