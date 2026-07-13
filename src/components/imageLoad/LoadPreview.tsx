import { JSX, RefObject } from 'react';
import './LoadPreview.css';

const PREVIEW_MAX_W = 680;
const PREVIEW_MAX_H = 340;

type Props = {
  label: string; // "Image" | "Brush"
  width: number;
  height: number;
  colorCount: number;
  // Shown after the color count when set (e.g. "fits a palette exactly");
  // omitted entirely otherwise.
  exactNote?: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
};

// What was opened (size, distinct colors) plus a live preview canvas the
// caller draws into via canvasRef — shared by the Load Image and Load Brush
// requesters, which show identical information about identically-shaped
// pending pixels. Drawn at native size and scaled by CSS with
// image-rendering: pixelated; tiny images upscale by a whole factor so their
// pixels stay even, large ones shrink fractionally, which a preview can
// afford.
export function LoadPreview({
  label,
  width,
  height,
  colorCount,
  exactNote,
  canvasRef,
}: Props): JSX.Element {
  let previewScale = Math.min(PREVIEW_MAX_W / width, PREVIEW_MAX_H / height);
  if (previewScale >= 1) {
    previewScale = Math.max(1, Math.floor(previewScale));
  }
  const previewStyle = {
    width: Math.round(width * previewScale),
    height: Math.round(height * previewScale),
  };

  return (
    <div className="load-preview">
      <div className="load-preview__info">
        <span className="load-preview__info-label">{label}</span>
        {`${width}x${height}`} &middot; <b>{colorCount.toLocaleString('en-US')}</b>{' '}
        {colorCount === 1 ? 'color' : 'colors'}
        {exactNote && <span className="load-preview__exact"> &mdash; {exactNote}</span>}
      </div>
      <canvas ref={canvasRef} className="load-preview__canvas" style={previewStyle} />
    </div>
  );
}
