import { JSX, useState } from 'react';
import './SaveAsDialog.css';
import { useActions, useAppState } from '../../overmind';
import { settleSaveAsPrompt } from '../menu/pendingSaveAs';
import { pictureIsIndexed, SaveFormat, SAVE_FORMATS, saveFormats } from '../menu/saveFormats';
import { sanitizeFileName, withExtension, hasSaveFilePicker } from '../menu/saveAsPng';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroInputField } from '../ui/RetroInputField';
import { RetroToggle } from '../ui/RetroToggle';

// Long enough for any name someone means, short enough that the note below
// cannot outgrow the height reserved for it — and filesystems stop caring well
// before this anyway.
const MAX_NAME_LENGTH = 40;

// Each disabled segment's tooltip: the short form, since a tooltip is read
// while already pointing at the format it is about.
const TRUE_COLOR_TITLE = 'The picture has True Color pixels, which this format cannot store.';

// The body's version, which also says what to do about it. "Set Screen Format"
// is that requester's own header and "True Color" the switch's own label, so
// this can be followed by looking for those exact words. Naming the one action
// that helps matters more than naming the problem: applyScreenFormat is what
// flattens true-color pixels onto the palette, and nothing else does.
const TRUE_COLOR_NOTE =
  'Only PNG: this picture has True Color pixels, which an indexed format (IFF and GIF) cannot ' +
  'store. Turn True Color off in Set Screen Format to convert to an indexed palette.';

// The one requester Save As goes through, on every browser.
//
// It asks the format always — the three differ in the thing this program is
// about, since PNG flattens the palette where IFF and GIF keep it — and the
// name only where nobody else will. On Chromium the OS picker asks for the name
// a moment later, so a field here would be the same question twice; everywhere
// else the file goes to the downloads folder under a name we supply.
export function SaveAsDialog(): JSX.Element | null {
  const state = useAppState();
  if (state.app.saveAsPrompt === null) {
    return null;
  }
  // remounts per prompt, so the fields start from the offered values each time
  return <SaveAsDialogOpen />;
}

function SaveAsDialogOpen(): JSX.Element {
  const state = useAppState();
  const actions = useActions();
  const suggested = state.app.saveAsPrompt as string;

  // Scanned once per prompt rather than per render: it reads the canvas back,
  // and the answer cannot change while a modal is up.
  const [indexed] = useState(pictureIsIndexed);

  // The last format used, so repeating a save is one click and changing one is
  // a deliberate act — unless that format cannot hold what is now on the
  // canvas, in which case the only one that can is already selected rather
  // than the requester opening on a disabled option.
  const [format, setFormat] = useState<SaveFormat>(
    indexed || state.app.saveFormat === 'png' ? state.app.saveFormat : 'png'
  );
  const [name, setName] = useState(suggested);

  // The extension follows the format rather than the name — picking GIF after
  // typing "harbour" offers harbour.gif, and the name field never carries one.
  const extension = saveFormats[format].fileType.extension;

  // Sanitized here rather than only on the way out, so the name previewed below
  // is the name that lands on disk. Doing it in saveFile alone meant typing
  // "../bad:name?" promised exactly that and wrote "badname" — and left the
  // document called something no save would ever produce.
  const cleaned = sanitizeFileName(name);
  const asksForName = !hasSaveFilePicker();
  const valid = !asksForName || cleaned !== '';

  const close = (choice: { format: SaveFormat; name: string | null } | null): void => {
    actions.app.closeSaveAsPrompt();
    settleSaveAsPrompt(choice);
  };

  const save = (): void => {
    if (!valid) {
      return;
    }
    // Only answers the prompt. Naming the document and remembering the format
    // are the save handler's job, once a file has actually been written — the
    // picker branch and this one both go through it, so they cannot disagree.
    close({ format, name: asksForName ? cleaned : null });
  };

  return (
    <Modal header="Save As" width={520}>
      <div className="save-as__body">
        <div className="save-as__formats">
          <RetroToggle
            options={SAVE_FORMATS.map((id) => {
              // An indexed format cannot hold true-color pixels. Disabled here
              // rather than refused after the fact, and the tooltip goes on the
              // segments that are actually out — hung off all three, it told you
              // PNG could not store the picture while PNG sat there enabled.
              const unavailable = !indexed && id !== 'png';
              return {
                value: id,
                label: saveFormats[id].label,
                disabled: unavailable,
                title: unavailable ? TRUE_COLOR_TITLE : undefined,
              };
            })}
            value={format}
            onChange={(value): void => setFormat(value as SaveFormat)}
          />
          {/* What distinguishes them, in one line, because "PNG or GIF" is not
              a question anyone can answer without being told which keeps the
              palette. Height reserved for the longest of the three so the
              requester does not resize as the choice changes. */}
          <p className="save-as__format-note">{saveFormats[format].note}</p>
          {/* Why two of them are greyed out, and how to un-grey them — beside
              the descriptions rather than in place of them, since what PNG is
              remains worth knowing while you are being told it is your only
              option.

              No reserved height, unlike the note above: `indexed` is read once
              when the requester opens, so this is either present for the whole
              of its life or absent for the whole of it. The rule it would be
              serving is that a requester must not resize *while you are looking
              at it*, and nothing here can make it. Holding four empty lines
              open on every ordinary save buys nothing. */}
          {!indexed && <p className="save-as__true-color-note">{TRUE_COLOR_NOTE}</p>}
        </div>

        {asksForName && (
          <RetroInputField
            label="Name:"
            value={name}
            onChange={(value): void => setName(value.slice(0, MAX_NAME_LENGTH))}
            size={24}
            onEnter={save}
          />
        )}

        {/* Only on the branch that has no picker: without showSaveFilePicker
            the page cannot choose where the file goes or overwrite one. The
            setting named is the one thing that changes that, and it belongs to
            the reader, not to us — so it is said once, here, where it applies.

            Conditional, because whether that setting is already on is not
            something we can find out. No API exposes it, and the download path
            reports nothing back — no completion event, no final name, no sign
            of whether a dialog appeared. (The one side-channel, watching for
            the window to blur, is a race with no defined timing that a
            macOS sheet may not trigger at all.) This used to say "Saved to your
            downloads folder ... saving again adds a numbered copy", which is
            flatly wrong for anyone who has the setting on: they get a dialog
            and no numbered copy. Phrased as a condition it is true either way,
            and the reader knows which side they are on even though we cannot.

            Deliberately not naming a browser or a menu path: Firefox calls it
            "Always ask you where to save files" and Safari "Ask for each
            download", and sniffing the user agent to pick between them risks
            confidently giving the wrong instructions. */}
        {asksForName && (
          <p className="save-as__note">
            <span>
              Saved as <b>{withExtension(valid ? cleaned : suggested, extension)}</b>. If your
              browser saves straight to the downloads folder, saving again adds a numbered copy —
              turn on its &ldquo;ask where to save each file&rdquo; setting to choose the folder and
              overwrite instead.
            </span>
          </p>
        )}
      </div>
      <RetroButton variant="secondary" onClick={(): void => close(null)}>
        Cancel
      </RetroButton>
      <RetroButton variant="primary" onClick={save} disabled={!valid}>
        Save
      </RetroButton>
    </Modal>
  );
}
