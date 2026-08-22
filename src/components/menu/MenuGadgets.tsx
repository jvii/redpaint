import React, { JSX, ReactNode, useRef } from 'react';
import './MenuGadgets.css';

// The menu's icon gadgets (the screen-status segment language: 2px black
// borders, shared seams inside a group, one hard drop shadow per group,
// orange hover). All gadgets on a row share one fixed height so seams and
// shadows line up.

export function GadgetGroup({ children }: { children: ReactNode }): JSX.Element {
  return <span className="wb-gadget-group">{children}</span>;
}

type GadgetProps = {
  // the caller supplies a ready-to-render icon element - PixelIcon for the
  // disk/brush glyphs, a transformIcons.tsx component for the drawer's
  // transform row - so this component stays icon-style agnostic
  icon?: ReactNode;
  // rendered icon-left, text-right, the same shape everywhere in the menu -
  // the rail (Open/Save/Brush) and the drawer's transform gadgets alike
  label?: string;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  // pressed-in (armed/open) state
  on?: boolean;
  // icon above the label instead of beside it (the transform gadgets)
  stacked?: boolean;
  // the single key that triggers this action (shown as a keycap beside the
  // label, stacked gadgets only: see docs/style-guide.md's "Text on controls"
  // section). Omit for gadgets with no hotkey (Bend H/V).
  shortcut?: string;
};

export function Gadget({
  icon,
  label,
  title,
  onClick,
  disabled = false,
  on = false,
  stacked = false,
  shortcut,
}: GadgetProps): JSX.Element {
  return (
    <button
      className={
        'wb-gadget' + (on ? ' wb-gadget--on' : '') + (stacked ? ' wb-gadget--stacked' : '')
      }
      type="button"
      title={title}
      aria-label={title}
      onClick={(event): void => {
        // Gadgets like Open/Save image synchronously trigger a native OS file
        // dialog that steals the cursor before the button unmounts (the menu
        // closes on mouseleave once the cursor leaves the page: see
        // MenuGadgets.tsx's useFileOpener comment). The browser's native
        // title-attribute tooltip isn't tied to DOM lifecycle, so it stays
        // painted over whatever is there now. Clearing the attribute forces it
        // to hide immediately.
        //
        // Restored only once the pointer really moves over this button again.
        // Neither of the obvious moments works: a frame later (rAF) is still
        // while the file dialog is up, and mouseleave *is* the dialog opening,
        // since the picker takes the cursor off-page (see useFileOpener below).
        // Both put the title back while the cursor was parked on the button, so
        // it armed a fresh tooltip the instant the dialog closed — and that one
        // surfaced over the requester the chosen file had just opened.
        //
        // A mousemove cannot happen in that window: the cursor comes back from
        // the picker where it left, and the button unmounts with the menu
        // before anything moves. When the pointer does move here, the user is
        // deliberately hovering and should get the tooltip.
        const button = event.currentTarget;
        button.removeAttribute('title');
        const restore = (): void => {
          button.setAttribute('title', title);
          button.removeEventListener('mousemove', restore);
        };
        button.addEventListener('mousemove', restore);
        onClick?.();
      }}
      disabled={disabled}
    >
      {stacked ? <span className="wb-gadget__icon">{icon}</span> : icon}
      {stacked ? (
        <span className="wb-gadget__labelrow">
          {label && <span className="wb-gadget__label">{label}</span>}
          {shortcut && <kbd className="wb-gadget__keycap">{shortcut}</kbd>}
        </span>
      ) : (
        label && <span className="wb-gadget__label">{label}</span>
      )}
    </button>
  );
}

export type FileOpener = {
  // wire this to whatever button should trigger the OS file picker
  open: () => void;
  // render this once, somewhere that stays mounted regardless of menu/drawer
  // open state (see the comment on useFileOpener for why that matters)
  input: JSX.Element;
};

// A hidden file input decoupled from its trigger button's mount lifetime. The
// button lives in the menu's collapsible content, which unmounts when the menu
// closes, and opening the OS file picker moves the cursor off-page, firing a
// real mouseleave on .menu while the dialog is still open. An <input> in that
// content would be torn down mid-flight and the 'change' event would have
// nowhere to land: file picked, nothing happens, no error. (Never reproduces
// under CDP, which cannot move the cursor into a native window.)
//
// The caller renders `input` somewhere that survives the close (a sibling of
// the collapsible content), and wires a plain button's onClick to `open`.
export function useFileOpener(
  handleFile: (input: HTMLInputElement) => void,
  accept = 'image/*'
): FileOpener {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return {
    open: (): void => fileInputRef.current?.click(),
    input: (
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={(event): void => {
          handleFile(event.target);
          event.target.value = '';
        }}
        style={{ display: 'none' }}
      />
    ),
  };
}

// A headed gadget cluster (the drawer's File / Size / Flip / Rotate / Bend
// groups). The head is a quiet sub-label (no rule) - only the drawer's own
// "Brush" title and the rail's "Mode" title get the underlined section-head
// treatment, so the panel doesn't turn into a grid of horizontal rules.
export function GadgetCluster({
  head,
  className,
  children,
}: {
  head?: string;
  className?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className={'wb-cluster' + (className ? ' ' + className : '')}>
      {/* the JSX entity renders a non-breaking space for headless clusters: a
          plain ' ' is whitespace-only block content, which CSS collapses to
          zero height, dropping the blank row's gadgets out of alignment with
          its siblings' real headings (the entity survives file rewrites,
          where a literal invisible NBSP character was twice lost) */}
      <div className={'wb-cluster__subhead' + (head ? '' : ' wb-cluster__subhead--blank')}>
        {head ?? <>&nbsp;</>}
      </div>
      <GadgetGroup>{children}</GadgetGroup>
    </div>
  );
}
