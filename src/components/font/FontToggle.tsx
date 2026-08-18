import { JSX } from 'react';
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

type Props = {
  families: string[];
  // '' when the selection is in the other list — a bundled face is not among
  // the system ones and the other way round, and neither list should light up
  // a row for a family the other one owns.
  value: string;
  onChange: (family: string) => void;
};

export function FontToggle({ families, value, onChange }: Props): JSX.Element {
  return (
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
              style={{ fontFamily: quoteFamily(family) }}
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
  );
}
