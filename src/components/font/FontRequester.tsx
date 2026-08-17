import { JSX, useMemo, useRef } from 'react';
import './FontRequester.css';
import { useActions, useAppState } from '../../overmind';
import { BITMAP_SCALES, FONT_SIZES } from '../../overmind/font/state';
import { BUNDLED_FACES } from '../../domain/BitmapFont';
import { TextFace } from '../../domain/PixelFont';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroFieldset } from '../ui/RetroFieldset';
import { RetroToggle } from '../ui/RetroToggle';
import { useFontPreview } from './useFontPreview';

// The sample. A pangram would not fit at the sizes worth inspecting, and what
// matters here is stems, bowls, a descender and digits — "Hamburgefonstiv" is
// the type-design standard for exactly that.
const SAMPLE = 'Hamburgefonstiv 123';

// CSS px. Fixed, so the window never resizes because a different family or
// size was picked (docs/style-guide.md, "A window never resizes because its
// own content changed").
const PREVIEW_WIDTH = 420;
const PREVIEW_HEIGHT = 150;

// DPaint's Font menu, reached by right-clicking the Text gadget as PyDPainter
// does. Family, size and style, over a preview that shows the real thing.
export function FontRequester(): JSX.Element | null {
  const state = useAppState();

  if (!state.font.settingsOpen) {
    return null;
  }
  return <FontRequesterOpen />;
}

function FontRequesterOpen(): JSX.Element {
  const state = useAppState();
  const actions = useActions();
  const previewRef = useRef<HTMLCanvasElement>(null);

  const isBitmap = state.font.faceId !== null;

  // Memoized because useFontPreview depends on it by identity, and because a
  // plain copy is what the rasterizer wants anyway (see TextTool's textFont).
  const face: TextFace = useMemo(
    (): TextFace =>
      state.font.faceId
        ? { kind: 'bitmap', id: state.font.faceId, scale: state.font.scale }
        : {
            kind: 'outline',
            spec: {
              family: state.font.family,
              size: state.font.size,
              bold: state.font.bold,
              italic: state.font.italic,
            },
          },
    [
      state.font.faceId,
      state.font.scale,
      state.font.family,
      state.font.size,
      state.font.bold,
      state.font.italic,
    ]
  );

  // The preview shows what the selected half of the gadget will paint, so
  // outline text previews as outline.
  const outline = state.toolbox.activeToolId === 'textNoFill';

  useFontPreview(
    previewRef,
    face,
    SAMPLE,
    outline,
    state.palette.displayForegroundColor,
    state.palette.displayBackgroundColor,
    PREVIEW_WIDTH,
    PREVIEW_HEIGHT
  );

  const familyOptions = state.font.families.map((family): { value: string; label: string } => ({
    value: family,
    label: family,
  }));

  return (
    <Modal header="Font" width={820}>
      <div className="font-requester__body">
        <div className="font-requester__family-column">
          {/* The bundled pixel faces lead, above the machine's own. They are
              the only way to have text below about 12px at all, and they are
              the same on every machine — the list under them is not. */}
          <RetroFieldset legend="Bitmap">
            <RetroToggle
              variant="column"
              options={BUNDLED_FACES.map((bundled): { value: string; label: string } => ({
                value: bundled.id,
                label: bundled.name,
              }))}
              value={state.font.faceId ?? ''}
              onChange={(value): void => actions.font.setBundledFace(value)}
            />
          </RetroFieldset>
          <RetroFieldset legend="Font">
            <div className="font-requester__family-list retro-scrollbar">
              {familyOptions.length > 0 ? (
                <RetroToggle
                  variant="column"
                  options={familyOptions}
                  value={isBitmap ? '' : state.font.family}
                  onChange={(value): void => actions.font.setFamily(value)}
                />
              ) : (
                <p className="font-requester__note">No fonts found.</p>
              )}
            </div>
            {/* Where the list came from, because the two are not the same
                thing and the short one must not read as "all you have".
                See domain/systemFonts.ts. */}
            <p className="font-requester__note">
              {state.font.familiesSource === 'enumerated'
                ? 'Fonts installed on this computer.'
                : 'Common fonts found on this computer. Only this browser can list them all.'}
            </p>
          </RetroFieldset>
        </div>

        <div className="font-requester__settings-column">
          {/* A bitmap face has exactly one size, so it takes whole-number
              scales where an outline face takes point sizes. Two controls
              rather than one disabled one: they are different quantities, and
              4 meaning "four times" where 8 means "eight pixels" would be the
              same gadget lying about which. */}
          {isBitmap ? (
            <RetroFieldset legend="Scale">
              <RetroToggle
                options={BITMAP_SCALES.map((scale): { value: string; label: string } => ({
                  value: String(scale),
                  label: `${scale}x`,
                }))}
                value={String(state.font.scale)}
                onChange={(value): void => actions.font.setScale(Number(value))}
              />
            </RetroFieldset>
          ) : (
            <RetroFieldset legend="Size">
              <RetroToggle
                variant="grid"
                columns={5}
                options={FONT_SIZES.map((size): { value: string; label: string } => ({
                  value: String(size),
                  label: String(size),
                }))}
                value={String(state.font.size)}
                onChange={(value): void => actions.font.setSize(Number(value))}
              />
            </RetroFieldset>
          )}

          <RetroFieldset legend="Style">
            <div className="font-requester__style-row">
              <RetroToggle
                options={[
                  { value: 'off', label: 'Plain' },
                  { value: 'on', label: 'Bold' },
                ]}
                value={state.font.bold ? 'on' : 'off'}
                onChange={(value): void => actions.font.setBold(value === 'on')}
                // A bitmap face is drawn, not generated: there is no bold or
                // italic of it to switch to, and synthesizing one would smear
                // the pixels it exists to keep.
                disabled={isBitmap}
              />
              <RetroToggle
                options={[
                  { value: 'off', label: 'Upright' },
                  { value: 'on', label: 'Italic' },
                ]}
                value={state.font.italic ? 'on' : 'off'}
                onChange={(value): void => actions.font.setItalic(value === 'on')}
                disabled={isBitmap}
              />
            </div>
          </RetroFieldset>

          <RetroFieldset legend="Preview">
            {/* Rendered through the tool's own rasterizer, not as DOM text:
                see useFontPreview. Magnified at small sizes so a face that
                falls apart there shows it here first. */}
            <div className="font-requester__preview-frame">
              <canvas
                ref={previewRef}
                width={PREVIEW_WIDTH}
                height={PREVIEW_HEIGHT}
                className="font-requester__preview"
              />
            </div>
            <p className="font-requester__note">
              {isBitmap
                ? 'Drawn as pixels, so it stays sharp at every scale.'
                : 'Below 12px an outline font has no whole pixels to put its stems on, and breaks up.'}
            </p>
          </RetroFieldset>
        </div>
      </div>

      <RetroButton variant="primary" onClick={(): void => actions.font.closeSettings()}>
        OK
      </RetroButton>
      <RetroButton variant="secondary" onClick={(): void => actions.font.cancelSettings()}>
        Cancel
      </RetroButton>
    </Modal>
  );
}
