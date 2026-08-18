import { JSX, useEffect, useMemo, useRef } from 'react';
import './FontRequester.css';
import { useActions, useAppState } from '../../overmind';
import { sizeRangeFor } from '../../overmind/font/state';
import { BUNDLED_OUTLINE_FACES, bundledOutlineFace } from '../../domain/BundledFonts';
import { FontSpec } from '../../algorithm/glyphRaster';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroFieldset } from '../ui/RetroFieldset';
import { RetroSlider } from '../ui/RetroSlider';
import { RetroToggle } from '../ui/RetroToggle';
import { FontToggle } from './FontToggle';
import { useFontPreview } from './useFontPreview';

// The sample: a capital with diagonals, ascenders, a round lowercase with its
// counter, and digits. Between them they show whether a face survived being
// thresholded, which is the question this requester exists to answer. Short
// because the preview draws at the size the text really is (useFontPreview)
// and a long one spends the box on repeats of what the first few letters
// already said.
const SAMPLE = 'Abcd 123';

// The preview's box, in CSS px. Fixed, so the window never resizes because a
// different family or size was picked (docs/style-guide.md, "A window never
// resizes because its own content changed"). Its raw buffer is a different
// figure entirely — see previewWidth/Height below.
const PREVIEW_DISPLAY_WIDTH = 460;
const PREVIEW_DISPLAY_HEIGHT = 236;

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
  const familyListRef = useRef<HTMLDivElement>(null);
  // Once per open. Re-centring on every change would yank the list out from
  // under the pointer the moment a family is clicked.
  const centredOnOpen = useRef(false);

  // The chosen family can be hundreds of names down a list that opens at the
  // top, where it is both invisible and unreachable without hunting. Centre it
  // when the list arrives — the families load asynchronously, so this is the
  // first render that has anything to scroll to.
  useEffect((): void => {
    const list = familyListRef.current;
    const selected = list?.querySelector<HTMLElement>('.retro-toggle__segment--selected');
    if (centredOnOpen.current || !list || !selected) {
      return;
    }
    centredOnOpen.current = true;
    // Measured rather than read off offsetTop, which is relative to the nearest
    // positioned ancestor and so would depend on styling elsewhere.
    const listBox = list.getBoundingClientRect();
    const selectedBox = selected.getBoundingClientRect();
    list.scrollTop += selectedBox.top - listBox.top - (listBox.height - selectedBox.height) / 2;
  }, [state.font.families.length]);

  // Memoized because useFontPreview depends on it by identity, and because a
  // plain copy is what the rasterizer wants anyway (see TextTool's textFont).
  const spec: FontSpec = useMemo(
    (): FontSpec => ({
      family: state.font.family,
      size: state.font.size,
      bold: state.font.bold,
      italic: state.font.italic,
    }),
    [state.font.family, state.font.size, state.font.bold, state.font.italic]
  );

  // The preview shows what the selected half of the gadget will paint, so
  // outline text previews as outline.
  const outline = state.toolbox.activeToolId === 'textNoFill';

  // The buffer's own pixel count, sized so the box is an equally-sized window
  // into the real canvas: the fixed CSS size divided by MainCanvas's live
  // displayScale, which already folds in devicePixelRatio, the screen format's
  // pixel aspect and the window size. The CSS box then scales the buffer back
  // up by exactly that, so text previews at the size it will actually be
  // painted. Per axis, since a screen format's pixels need not be square — and
  // the text tool does not correct for that (glyphRaster.ts), so neither does
  // its preview. The same arrangement the fill style swatch uses.
  const displayScale = state.canvas.displayScale;
  const previewWidth = Math.round(PREVIEW_DISPLAY_WIDTH / displayScale.x);
  const previewHeight = Math.round(PREVIEW_DISPLAY_HEIGHT / displayScale.y);

  useFontPreview(
    previewRef,
    spec,
    SAMPLE,
    outline,
    state.font.underline,
    state.palette.displayForegroundColor,
    state.palette.displayBackgroundColor,
    previewWidth,
    previewHeight
  );

  // A bundled face is picked as a family like any other, so it lights up in the
  // bundled list rather than in the system one below — where it would not
  // appear anyway, since nothing installed it.
  const isBundled = bundledOutlineFace(state.font.family) !== undefined;
  const bundledSelection = isBundled ? state.font.family : '';
  const systemSelection = isBundled ? '' : state.font.family;

  const sizeRange = sizeRangeFor(bundledOutlineFace(state.font.family)?.gridSize);

  const styleValues = [
    ...(state.font.bold ? ['bold'] : []),
    ...(state.font.italic ? ['italic'] : []),
    ...(state.font.underline ? ['underline'] : []),
  ];

  return (
    <Modal header="Font" width={900}>
      <div className="font-requester__body">
        <div className="font-requester__family-column">
          {/* The bundled faces lead, above the machine's own. Each is drawn
              on a pixel grid, which is what this tool wants and what the list
              below cannot promise — and they are the same on every machine,
              where that list is not. */}
          <RetroFieldset legend="Bundled Fonts">
            <FontToggle
              families={BUNDLED_OUTLINE_FACES.map((bundled): string => bundled.family)}
              value={bundledSelection}
              onChange={(value): void => actions.font.setFamily(value)}
            />
          </RetroFieldset>
          {/* Named for where they came from, not for being fonts — the list
              above it is fonts too. */}
          <RetroFieldset legend="System Fonts">
            <div className="font-requester__family-list retro-scrollbar" ref={familyListRef}>
              {state.font.families.length > 0 ? (
                <FontToggle
                  families={state.font.families}
                  value={systemSelection}
                  onChange={(value): void => actions.font.setFamily(value)}
                />
              ) : (
                /* Only once the list has actually been looked for. Before
                   that there is nothing to report: enumeration is a fetch and
                   a permission prompt, and saying "none" in the meantime is a
                   wrong answer that corrects itself a second later. */
                state.font.familiesLoaded && <p className="font-requester__note">No fonts found.</p>
              )}
            </div>
            {/* Only where the list was guessed. A browser that can enumerate
                shows what is actually installed and needs no caveat; one that
                cannot is showing a probe of names picked in advance, and
                anything installed under a name nobody guessed is simply absent
                from it. Saying so beats letting a dozen entries read as "all
                the fonts you have". See domain/systemFonts.ts. */}
            {state.font.familiesSource === 'probed' && (
              <p className="font-requester__note">
                Common fonts, found by trying names — this browser will not list what is installed.
              </p>
            )}
          </RetroFieldset>
        </div>

        <div className="font-requester__settings-column">
          <RetroFieldset legend="Size">
            {/* No figure on it. A px size is an em rather than a height, so the
                same number is a different size in every face and reading it
                told you nothing — where the preview, which draws at true canvas
                scale, tells you exactly. A bundled face steps by its own pixel
                grid, an installed one by single pixels. */}
            <div className="font-requester__size-slider">
              <RetroSlider
                value={state.font.size}
                min={sizeRange.min}
                max={sizeRange.max}
                step={sizeRange.step}
                onChange={(size): void => actions.font.setSize(size)}
              />
            </div>
          </RetroFieldset>

          {/* Filled/Unfilled rides alongside Style rather than under a legend
              of its own: its two segments say what they are, where B/I/U are
              single letters that need heading. Aligned on the toggles, not the
              tops, so the two groups' gadgets sit on one line. */}
          <div className="font-requester__style-row">
            <RetroFieldset legend="Style">
              <RetroToggle
                options={[
                  {
                    value: 'bold',
                    label: <span className="font-requester__style-bold">B</span>,
                    title: 'Bold',
                  },
                  {
                    value: 'italic',
                    label: <span className="font-requester__style-italic">I</span>,
                    title: 'Italic',
                  },
                  {
                    value: 'underline',
                    label: <span className="font-requester__style-underline">U</span>,
                    title: 'Underline',
                  },
                ]}
                selectedValues={styleValues}
                onChange={(value): void => {
                  if (value === 'bold') {
                    actions.font.setBold(!state.font.bold);
                  } else if (value === 'italic') {
                    actions.font.setItalic(!state.font.italic);
                  } else {
                    actions.font.setUnderline(!state.font.underline);
                  }
                }}
              />
            </RetroFieldset>

            {/* The same choice as the gadget's two halves, and it sets the same
                tool — so the preview follows it, and closing the requester
                leaves that half armed. */}
            <RetroToggle
              options={[
                { value: 'unfilled', label: 'Unfilled' },
                { value: 'filled', label: 'Filled' },
              ]}
              value={outline ? 'unfilled' : 'filled'}
              onChange={(value): void =>
                actions.toolbox.setSelectedDrawingTool(
                  value === 'filled' ? 'textFilled' : 'textNoFill'
                )
              }
            />
          </div>

          <RetroFieldset legend="Preview" detail={state.font.family}>
            {/* Rendered through the tool's own rasterizer, not as DOM text,
                and 1:1 with the canvas — see useFontPreview. A face that falls
                apart at a size shows it here first, at the size it will be. */}
            <div className="font-requester__preview-frame">
              <canvas
                ref={previewRef}
                width={previewWidth}
                height={previewHeight}
                className="font-requester__preview"
              />
            </div>
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
