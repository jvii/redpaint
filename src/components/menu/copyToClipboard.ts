import { overmind } from '../../index';
import { brushRecall } from '../../brush/BrushRecall';
import { CustomBrush } from '../../brush/CustomBrush';
import { isBuiltInBrush } from '../../overmind/brush/state';
import { blobMakerFor } from './saveFormats';
import { brushBlobMakerFor } from './brushSaveFormats';
import { writeImageToClipboard } from './clipboard';

// Built-in brushes are excluded, as they are from Save: a few monochrome
// pixels is not worth putting in another program. That exclusion is what lets
// the copy chord skip its requester.
export function copyableBrush(): CustomBrush | null {
  const brush = brushRecall.current;
  return brush instanceof CustomBrush && !isBuiltInBrush(brush) ? brush : null;
}

export async function copyPicture(): Promise<void> {
  const { palette } = overmind.state;
  const makeBlob = blobMakerFor('png', Object.values(palette.palette), palette.ranges);
  report(makeBlob !== null && (await writeImageToClipboard(makeBlob)), 'picture');
}

export async function copyBrush(): Promise<void> {
  const brush = copyableBrush();
  if (!brush) {
    return;
  }
  const makeBlob = brushBlobMakerFor(brush, 'png', Object.values(overmind.state.palette.palette));
  report(makeBlob !== null && (await writeImageToClipboard(makeBlob)), 'brush');
}

// A copy leaves the screen exactly as it was, so the menu bar is the only
// thing that says it happened (docs/style-guide.md).
function report(copied: boolean, subject: string): void {
  overmind.actions.app.flash(copied ? { name: 'Copied', value: subject } : { name: 'Copy failed' });
}
