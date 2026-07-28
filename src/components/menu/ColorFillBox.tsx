import { JSX, useRef } from 'react';
import { useAppState } from '../../overmind';
import { useFillStyleSwatch } from '../fillStyle/useFillStyleSwatch';

// CSS px, the box's interior (inside its 2px border) — see .menubar__fill-box,
// which must agree with these.
const BOX_WIDTH = 80;
const BOX_HEIGHT = 26;

// DPaint's Color Fill Box, in the menubar slot it occupied there: a small
// rectangular preview of the pattern or gradient the next fill will use.
// Rendered only when there *is* one to show — the caller (Menubar) leaves it
// out entirely when a fill would come out solid, where the palette's own
// foreground indicator already tells you the whole story. That absence is
// DPaint's behavior too, not just a simplification; see useFillStyleSwatch's
// header for the DP2 manual's wording on both points.
export function ColorFillBox(): JSX.Element {
  const state = useAppState();

  // Raw pixel count, so the box is a true-scale window into the fill rather
  // than a re-scaled impression of it: the same convention (and the same
  // reasoning) as the Fill Style requester's big preview — the box's fixed
  // physical size divided by the main canvas's live displayScale, which
  // already folds in devicePixelRatio, the screen format's pixel aspect and
  // the current zoom. A pattern therefore tiles here at exactly the size it
  // tiles on the page. Floored at 1 so a deeply zoomed-in canvas can't ask
  // for a zero-dimension buffer.
  const displayScale = state.canvas.displayScale;
  const rawWidth = Math.max(1, Math.round(BOX_WIDTH / displayScale.x));
  const rawHeight = Math.max(1, Math.round(BOX_HEIGHT / displayScale.y));

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useFillStyleSwatch(canvasRef, rawWidth, rawHeight);

  return (
    <canvas
      ref={canvasRef}
      width={rawWidth}
      height={rawHeight}
      className="menubar__fill-box transparency-checker"
      title={state.fillStyle.effectiveMode === 'pattern' ? 'Pattern fill' : 'Gradient fill'}
    />
  );
}
