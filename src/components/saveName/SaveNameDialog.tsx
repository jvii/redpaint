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
    // Remember it: the next save offers this name instead of the default, and
    // the document is now called something.
    actions.app.setDocumentName(cleaned);
    close(cleaned);
  };

  return (
    <Modal header="Save As" width={520}>
      <div className="save-name__body">
        <RetroInputField label="Name:" value={name} onChange={setName} size={24} onEnter={save} />
        {/* The extension is stated rather than typed: the format follows from
            which Save was chosen, and a field that let you type .iff onto a PNG
            would be offering a choice that does not exist. */}
        <p className="save-name__note">
          Saved to your downloads folder as{' '}
          <b>{withExtension(valid ? cleaned : base, prompt.extension)}</b>.
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
