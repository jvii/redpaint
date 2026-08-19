import { JSX, useRef } from 'react';
import './FillStyleSettings.css';
import { useActions, useAppState } from '../../overmind';
import { colorToRGBString } from '../../algorithm/color';
import { GradientAxis } from '../../algorithm/gradientFill';
import { FillMode } from '../../overmind/fillStyle/state';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroFieldset } from '../ui/RetroFieldset';
import { RetroToggle } from '../ui/RetroToggle';
import { RetroLabeledSlider } from '../ui/RetroLabeledSlider';
import { useFillStylePreview } from './useFillStylePreview';
import {
  GradientHorizontalIcon,
  GradientHorizontalLineIcon,
  GradientVerticalIcon,
} from './gradientAxisIcons';

// Icons, not text, per axis. A deliberate exception to RetroToggle's usual
// text-only segments (see docs/style-guide.md), matching DPaint's Fill Type
// requester where the axis is an arrow glyph rather than a word.
const AXIS_OPTIONS: { value: GradientAxis; label: JSX.Element; title: string }[] = [
  { value: 'vertical', label: <GradientVerticalIcon />, title: 'Vertical' },
  { value: 'horizontal', label: <GradientHorizontalIcon />, title: 'Horizontal' },
  { value: 'horizontalLine', label: <GradientHorizontalLineIcon />, title: 'Horizontal Line' },
];

// CSS px. The preview's display box is a fixed PREVIEW_DISPLAY_SIZE square
// regardless of screen format or window shape (using the layout space DPaint
// itself would use for this, not shrinking on one axis to match whatever the
// raw buffer's aspect happens to be; see previewWidth/Height below for how the
// raw buffer can end up a very different shape than the box).
const PREVIEW_DISPLAY_SIZE = 260;

// The fill style requester: redpaint's equivalent of DPaint's Fill Type dialog,
// opened by right-clicking the flood fill button or any filled shape tool
// button (they all edit the same shared style, like DPaint). Solid / Pattern
// ("from brush") / Gradient, the same three DPaint offers.
export function FillStyleSettings(): JSX.Element | null {
  const state = useAppState();

  if (!state.fillStyle.settingsOpen) {
    return null;
  }
  // remounts on every open, so useFillStylePreview's GL context and dither seed
  // always start fresh
  return <FillStyleSettingsOpen />;
}

function FillStyleSettingsOpen(): JSX.Element {
  const state = useAppState();
  const actions = useActions();

  // The swatch's raw pixel count, sized to show an equally-sized window into
  // the real canvas: the display box's fixed CSS size divided by MainCanvas's
  // live displayScale, which already folds in devicePixelRatio, the screen
  // format's pixel aspect and the window size. Unlike the box, the raw buffer
  // can come out a very different shape per axis: the ellipse
  // useFillStylePreview draws compensates per axis rather than the box chasing
  // the buffer's aspect and wasting the dialog's width. Computed here, not in
  // the hook, so the hook and the JSX canvas attributes agree.
  const displayScale = state.canvas.displayScale;
  const previewWidth = Math.round(PREVIEW_DISPLAY_SIZE / displayScale.x);
  const previewHeight = Math.round(PREVIEW_DISPLAY_SIZE / displayScale.y);

  const previewRef = useRef<HTMLCanvasElement>(null);
  useFillStylePreview(previewRef, previewWidth, previewHeight, displayScale, PREVIEW_DISPLAY_SIZE);

  const isGradient = state.fillStyle.mode === 'gradient';
  const isPattern = state.fillStyle.mode === 'brush';

  return (
    // Wider than the default requester because it lays out in two columns (see
    // the CSS): the 260px mode column, the gap, and a settings column with room
    // for the axis toggle and the sliders' labels.
    <Modal header="Fill Style" width={820}>
      <div className="fill-style-settings__body">
        {/* what the fill is, then what it looks like: the mode choice leads
            and its preview sits under, so the column reads as cause above
            effect and each of the two carries its own legend */}
        <div className="fill-style-settings__mode-column">
          <RetroFieldset legend="Fill">
            <RetroToggle
              variant="column"
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'brush', label: 'Pattern' },
                { value: 'gradient', label: 'Gradient' },
              ]}
              value={state.fillStyle.mode}
              onChange={(value): void => actions.fillStyle.setMode(value as FillMode)}
            />
          </RetroFieldset>
          <RetroFieldset legend="Preview">
            {/* The swatch's GL canvas is transparent outside its ellipse, so
                whatever sits behind it is what the fill appears to be drawn
                on. Painting that the current background color makes the
                preview show the pairing you will actually get on canvas -
                a light fill on a dark background reads completely
                differently from the same fill on paper. displayBackgroundColor,
                not backgroundColor, so it follows color cycling the way the
                palette's own indicator does. */}
            <div className="retro-frame">
              <canvas
                ref={previewRef}
                width={previewWidth}
                height={previewHeight}
                className="fill-style-settings__preview"
                style={{ backgroundColor: colorToRGBString(state.palette.displayBackgroundColor) }}
              />
            </div>
          </RetroFieldset>
        </div>
        {/* the settings behind the two modes that have any, in the same
            order as the segments that select them */}
        <div className="fill-style-settings__settings-column">
          <RetroFieldset
            legend="Pattern"
            bordered
            as="div"
            className="fill-style-settings__pattern-box"
          >
            <RetroButton
              variant="basic"
              disabled={!isPattern}
              onClick={actions.fillStyle.captureFromBrush}
            >
              From Brush
            </RetroButton>
            <span className="supporting-text fill-style-settings__hint">
              {!state.fillStyle.hasPattern
                ? 'No pattern captured yet — pick a brush, then click From Brush.'
                : 'From Brush tiles the current brush across the fill.'}
            </span>
          </RetroFieldset>
          {/* as="div" throughout this whole group, not just Range/Dither/
            Jitter: a real <fieldset> — even this outer one, on its own,
            with no flex directly on it and nothing nested inside it —
            still shows a smaller residual version of the same Safari
            auto-height bug their nesting caused. Since nothing here relies
            on native fieldset disabling (every control takes its own
            explicit `disabled` prop), there's no downside to using plain
            divs the whole way down. */}
          <RetroFieldset
            legend="Gradient"
            bordered
            as="div"
            className="fill-style-settings__gradient-box"
          >
            <RetroToggle
              variant="row"
              options={AXIS_OPTIONS}
              value={state.fillStyle.axis}
              onChange={(value): void => actions.fillStyle.setAxis(value as GradientAxis)}
              disabled={!isGradient}
            />
            <span className="supporting-text fill-style-settings__hint">
              Use the palette to select a color from a Range to create a gradient. Ranges are set in
              the Palette Editor.
            </span>
            <RetroFieldset legend="Dither" className="fill-style-settings__dither" as="div">
              <RetroLabeledSlider
                vertical={false}
                value={state.fillStyle.dither}
                min={0}
                max={20}
                onChange={(value): void => actions.fillStyle.setDither(value)}
                disabled={!isGradient}
              />
              <span className="supporting-text fill-style-settings__hint">
                How much adjacent bands randomly blend at their boundary. 0 = hard edges
              </span>
            </RetroFieldset>
            <RetroFieldset legend="Jitter" className="fill-style-settings__dither" as="div">
              <RetroLabeledSlider
                vertical={false}
                value={state.fillStyle.jitter}
                min={0}
                max={50}
                onChange={(value): void => actions.fillStyle.setJitter(value)}
                disabled={!isGradient}
              />
              <span className="supporting-text fill-style-settings__hint">
                How far dither can push a pixel, as a % of a band's width.
              </span>
            </RetroFieldset>
          </RetroFieldset>
        </div>
      </div>
      <RetroButton variant="secondary" onClick={actions.fillStyle.cancelSettings}>
        Cancel
      </RetroButton>
      <RetroButton variant="primary" onClick={actions.fillStyle.closeSettings}>
        OK
      </RetroButton>
    </Modal>
  );
}
