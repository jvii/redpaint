import { JSX } from 'react';
import './RetroToggle.css';

type Option = {
  value: string;
  label: string;
};

type Props = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
};

// A segmented toggle: raised gadget group with one shared drop shadow, where
// the selected segment sits pressed-in (workbench blue).
export function RetroToggle({ options, value, onChange }: Props): JSX.Element {
  return (
    <div className="retro-toggle">
      {options.map(
        (option): JSX.Element => (
          <button
            key={option.value}
            type="button"
            className={
              'retro-toggle__segment' +
              (option.value === value ? ' retro-toggle__segment--selected' : '')
            }
            onClick={(): void => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      )}
    </div>
  );
}
