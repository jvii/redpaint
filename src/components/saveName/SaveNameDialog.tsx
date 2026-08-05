import { JSX, useState } from 'react';
import './SaveNameDialog.css';
import { useActions, useAppState } from '../../overmind';
import { settleSaveNamePrompt } from '../menu/pendingSaveName';
import { sanitizeFileName, withExtension } from '../menu/saveAsPng';
import { Modal } from '../modal/Modal';
import { RetroButton } from '../ui/RetroButton';
import { RetroInputField } from '../ui/RetroInputField';

// Asks what to call the file, for the browsers with no native save picker of
// their own — Firefox and Safari, where the file otherwise lands in the
// downloads folder under whatever name the caller happened to pass. DPaint asked
// for a filename in its own requester too, so this is the period behaviour that
// Chromium's picker stands in for rather than an addition to it.
// Long enough for any name someone means, short enough that the note below
// cannot outgrow the height reserved for it — and filesystems stop caring well
// before this anyway.
const MAX_NAME_LENGTH = 40;

export function SaveNameDialog(): JSX.Element | null {
  const state = useAppState();
  if (!state.app.saveNamePrompt) {
    return null;
  }
  // remounts per prompt, so the field starts from the offered name each time
  return <SaveNameDialogOpen />;
}

function SaveNameDialogOpen(): JSX.Element {
  const state = useAppState();
  const actions = useActions();
  const prompt = state.app.saveNamePrompt as NonNullable<typeof state.app.saveNamePrompt>;

  // The offered name arrives with its extension already on it; the field shows
  // the base only, since the extension is not the user's to change here — the
  // format was chosen by which Save was clicked.
  const base = prompt.suggested.toLowerCase().endsWith(prompt.extension.toLowerCase())
    ? prompt.suggested.slice(0, -prompt.extension.length)
    : prompt.suggested;
  const [name, setName] = useState(base);

  // Sanitized here rather than only on the way out, so the name previewed below
  // is the name that lands on disk. Doing it in saveFile alone meant typing
  // "../bad:name?" promised exactly that and wrote "badname" — and left the
  // document called something no save would ever produce.
  const cleaned = sanitizeFileName(name);
  const valid = cleaned !== '';

  const close = (answer: string | null): void => {
    actions.app.closeSaveNamePrompt();
    settleSaveNamePrompt(answer);
  };

  const save = (): void => {
    if (!valid) {
      return;
    }
    // Only answers the prompt. Naming the document is the save handler's job,
    // once a file has actually been written — this branch and the OS picker
    // branch both go through it, so they cannot disagree.
    close(cleaned);
  };

  return (
    <Modal header="Save As" width={520}>
      <div className="save-name__body">
        <RetroInputField
          label="Name:"
          value={name}
          onChange={(value): void => setName(value.slice(0, MAX_NAME_LENGTH))}
          size={24}
          onEnter={save}
        />
        {/* The extension is stated rather than typed: the format follows from
            which Save was chosen, and a field that let you type .iff onto a PNG
            would be offering a choice that does not exist.

            The second half is only true on this branch, which is the only place
            this requester appears: with no showSaveFilePicker the page cannot
            choose where the file goes or overwrite one, and the browser numbers
            what it already has. The setting named is the one thing that changes
            that, and it belongs to the reader, not to us — so it is said once,
            here, where it is relevant.

            Deliberately not naming a browser or a menu path: Firefox calls it
            "Always ask you where to save files" and Safari "Ask for each
            download", and sniffing the user agent to pick between them risks
            confidently giving the wrong instructions. */}
        <p className="save-name__note">
          <span>
            Saved to your downloads folder as{' '}
            <b>{withExtension(valid ? cleaned : base, prompt.extension)}</b>, and saving again adds
            a numbered copy. To pick the folder and overwrite instead, turn on your browser&rsquo;s
            &ldquo;ask where to save each file&rdquo; setting.
          </span>
        </p>
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
