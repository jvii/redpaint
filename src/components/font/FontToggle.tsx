import { CSSProperties, JSX } from 'react';
import { RetroToggle } from '../ui/RetroToggle';
import { quoteFamily } from '../../algorithm/glyphRaster';
import './FontToggle.css';

// A family list where every row is also a specimen: the name in the app's own
// face on the left, and the same few letters set in the family itself on the
// right. A list of names alone says nothing about what any of them look like,
// and the requester's canvas preview only ever shows the one that is already
// selected — which is no help at all in finding the one you want.
//
// The specimen is ordinary DOM text, anti-aliased by the browser, and so is
// deliberately not what the tool will paint. That is the trade: it reads at a
// glance at list size, where a thresholded 1-bit render of three letters would
// be the thing being judged rather than a legible sample of the face. The
// preview pane is where the truthful answer lives, and it is on screen beside
// this.
const SPECIMEN = 'Abc';

// The size a sample is set at, and the line box it has to fit inside: the
// segment's own, font-size 24 at RetroToggle's line-height of 1.5.
const SPECIMEN_SIZE = 24;
const SPECIMEN_BOX = 36;
// Below this a sample has stopped being a sample.
const SPECIMEN_MIN = 12;

let scratch: CanvasRenderingContext2D | null | undefined;
// One measurement per family: the lists are rebuilt on every keystroke that
// changes the selection, and none of this can change while the app is running.
const specimens = new Map<string, Specimen>();

// How this family's sample has to be set to sit inside its row.
//
// Faces differ wildly in how much ink they hang around the baseline. Zapfino's
// 'Abc' at 24px stands 46px tall with a 41px ascent, and left alone its swash
// climbs out through the border of the row above it. Clipping would behead it —
// a third of that ascent — so the sample is set smaller until the whole
// letterform fits instead. What a row shows is then the entire character of the
// face, which is the only reason the sample is there.
//
// Only outliers ever shrink. Anything with ordinary metrics stays at
// SPECIMEN_SIZE, which is what keeps the bundled pixel faces on their 8px grid.
//
// The offset then centres the ink. CSS centres a line box by the font's
// declared ascent and descent, which for a display face bears little relation
// to where its letters actually sit — fitting the height alone still left
// Zapfino four pixels out. Measured and corrected rather than padded around,
// since how far out it lands is a property of the face.
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
  const size =
    ink > SPECIMEN_BOX
      ? Math.max(SPECIMEN_MIN, Math.floor((SPECIMEN_SIZE * SPECIMEN_BOX) / ink))
      : SPECIMEN_SIZE;

  // Measured again at the size actually used: none of this scales linearly, and
  // the placement below is only right for the metrics being rendered.
  scratch.font = `${size}px ${quoteFamily(family)}`;
  const m = scratch.measureText(SPECIMEN);
  // Where the browser will put the baseline in a line box of SPECIMEN_BOX, and
  // where the ink then sits around it.
  const baseline =
    (SPECIMEN_BOX - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 +
    m.fontBoundingBoxAscent;
  const inkCentre = baseline + (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
  return { size, offset: Math.round(SPECIMEN_BOX / 2 - inkCentre) };
}

type Props = {
  families: string[];
  // '' when the selection is in the other list — a bundled face is not among
  // the system ones and the other way round, and neither list should light up
  // a row for a family the other one owns.
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
    // Wrapped only to scope the segment clip below, which is a backstop for a
    // face whose ink sits so far off its own baseline that fitting the height
    // still leaves it reaching sideways or low.
    <div className="font-toggle">
      <RetroToggle
        variant="column"
        options={families.map((family): { value: string; label: JSX.Element } => ({
          value: family,
          label: (
            <span className="font-toggle__row">
              <span className="font-toggle__name">{family}</span>
              {/* Quoted for the same reason ctx.font needs it: a family whose
                  name has a digit-leading word ("Press Start 2P") is not a
                  valid unquoted CSS identifier sequence, and the declaration
                  would be dropped. */}
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
