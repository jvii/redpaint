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

// Shown in place of the format note, and as each disabled segment's tooltip.
const TRUE_COLOR_TITLE =
  'Only PNG: the picture has True Color pixels, which an indexed format cannot store.';

// The one requester Save As goes through, on every browser.
//
// It used to appear only where there was no native save picker, and only to ask
// for a name. The format is the reason it is always up now: the three formats
// differ in the thing this program is about — PNG flattens the palette, IFF and
// GIF keep it — and that was previously answered by which of three gadgets you
// clicked, which put the most consequential choice in the least visible place.
//
// So it asks the format always, and the name only where nobody else will. On
// Chromium the OS picker asks for the name a moment later, and a field here
// would be the same question twice; everywhere else the file goes to the
// downloads folder under whatever name we supply, so this is the only chance to
// supply one. Either way it is one requester, not two.
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
            options={SAVE_FORMATS.map((id) => ({
              value: id,
              label: saveFormats[id].label,
              // An indexed format cannot hold true-color pixels. Disabled here
              // rather than refused after the fact: the requester is where the
              // choice is made, so it is where a choice that cannot work should
              // be visibly unavailable.
              disabled: !indexed && id !== 'png',
              title: indexed ? undefined : TRUE_COLOR_TITLE,
            }))}
            value={format}
            onChange={(value): void => setFormat(value as SaveFormat)}
          />
          {/* What distinguishes them, in one line, because "PNG or GIF" is not
              a question anyone can answer without being told which keeps the
              palette. When two of them are greyed out that line gives way to
              the reason, which is the more useful thing to be reading. Height
              reserved for the longest so the requester does not resize as the
              choice changes. */}
          <p className="save-as__format-note">
            {indexed ? saveFormats[format].note : TRUE_COLOR_TITLE}
          </p>
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

        {/* Only true on the branch that has no picker: with no
            showSaveFilePicker the page cannot choose where the file goes or
            overwrite one, and the browser numbers what it already has. The
            setting named is the one thing that changes that, and it belongs to
            the reader, not to us — so it is said once, here, where it is
            relevant.

            Deliberately not naming a browser or a menu path: Firefox calls it
            "Always ask you where to save files" and Safari "Ask for each
            download", and sniffing the user agent to pick between them risks
            confidently giving the wrong instructions. */}
        {asksForName && (
          <p className="save-as__note">
            <span>
              Saved to your downloads folder as{' '}
              <b>{withExtension(valid ? cleaned : suggested, extension)}</b>, and saving again adds
              a numbered copy. To pick the folder and overwrite instead, turn on your
              browser&rsquo;s &ldquo;ask where to save each file&rdquo; setting.
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
