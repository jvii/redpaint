import { CSSProperties, JSX } from 'react';
import { RetroToggle } from '../ui/RetroToggle';
import { quoteFamily } from '../../algorithm/glyphRaster';
import './FontToggle.css';

// A family list where every row is also a specimen: the name in the app's own
// face, and the same letters set in the family itself. The specimen is ordinary
// anti-aliased DOM text, deliberately not what the tool paints — the preview
// pane beside it is where the truthful answer lives.
const SPECIMEN = 'Abc';

// The size a sample is set at, and the fixed line box it must fit.
const SPECIMEN_SIZE = 24;
const SPECIMEN_BOX = 36;
// And the width it has to fit. The row gives the name whatever is left, so a
// face wide enough to ignore this pushes the list out of its own column and
// into the gap before the preview.
const SPECIMEN_MAX_WIDTH = 110;
// Below this a sample has stopped being a sample.
const SPECIMEN_MIN = 12;

let scratch: CanvasRenderingContext2D | null | undefined;
// One measurement per family: the lists are rebuilt on every keystroke that
// changes the selection, and none of this can change while the app is running.
const specimens = new Map<string, Specimen>();

// How this family's sample has to be set to sit inside its row.
//
// A display face can hang far more ink around the baseline than its size
// suggests — Zapfino's 'Abc' at 24px stands 46px tall — or run far wider, so it
// is set smaller until the whole letterform fits rather than clipped. Only
// outliers shrink, which keeps the bundled pixel faces on their 8px grid.
//
// The offset then centres the ink: CSS centres a line box by the font's
// declared ascent and descent, which for such a face says little about where
// its letters sit.
type Specimen = { size: number; offset: number };

function specimenFor(family: string): Specimen {
  const cached = specimens.get(family);
  if (cached) {
    return cached;
  }
  const measured = measureSpecimen(family);
  specimens.set(family, measured);
  return measured;
}

function measureSpecimen(family: string): Specimen {
  if (scratch === undefined) {
    scratch = document.createElement('canvas').getContext('2d');
  }
  if (!scratch) {
    return { size: SPECIMEN_SIZE, offset: 0 };
  }
  scratch.font = `${SPECIMEN_SIZE}px ${quoteFamily(family)}`;
  const at24 = scratch.measureText(SPECIMEN);
  const ink = at24.actualBoundingBoxAscent + at24.actualBoundingBoxDescent;
  // Whichever axis is tighter decides.
  const scale = Math.min(
    ink > SPECIMEN_BOX ? SPECIMEN_BOX / ink : 1,
    at24.width > SPECIMEN_MAX_WIDTH ? SPECIMEN_MAX_WIDTH / at24.width : 1
  );
  const size =
    scale < 1 ? Math.max(SPECIMEN_MIN, Math.floor(SPECIMEN_SIZE * scale)) : SPECIMEN_SIZE;

  // Measured again at the size actually used: none of this scales linearly.
  scratch.font = `${size}px ${quoteFamily(family)}`;
  const m = scratch.measureText(SPECIMEN);
  // Where the browser puts the baseline, and where the ink sits around it.
  const baseline =
    (SPECIMEN_BOX - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 +
    m.fontBoundingBoxAscent;
  const inkCentre = baseline + (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
  return { size, offset: Math.round(SPECIMEN_BOX / 2 - inkCentre) };
}

type Props = {
  families: string[];
  // '' when the selection belongs to the other list.
  value: string;
  onChange: (family: string) => void;
};

function specimenStyle(family: string): CSSProperties {
  const { size, offset } = specimenFor(family);
  return {
    fontFamily: quoteFamily(family),
    fontSize: size,
    transform: offset === 0 ? undefined : `translateY(${offset}px)`,
  };
}

export function FontToggle({ families, value, onChange }: Props): JSX.Element {
  return (
    // Wrapped only to scope the segment clip, a backstop for a face still
    // reaching past its row after being fitted.
    <div className="font-toggle">
      <RetroToggle
        variant="column"
        options={families.map((family): { value: string; label: JSX.Element } => ({
          value: family,
          label: (
            <span className="font-toggle__row">
              <span className="font-toggle__name">{family}</span>
              {/* Quoted, or a digit-leading name is dropped as invalid CSS. */}
              <span
                className="font-toggle__specimen"
                style={specimenStyle(family)}
                aria-hidden="true"
              >
                {SPECIMEN}
              </span>
            </span>
          ),
        }))}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
