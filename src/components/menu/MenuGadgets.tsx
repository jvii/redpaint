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
  // the rail (Open/Save/Brush) and the drawer's transform gadgets alike.
  // A node rather than a string so a label can carry an arrow that needs its
  // own sizing (wb-gadget__arrow); everything else passes plain text.
  label?: ReactNode;
  title: string;
  // Set on a gadget that hands off to an OS file dialog: it then carries no
  // native tooltip while it is clickable. See the render below.
  opensFileDialog?: boolean;
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
  opensFileDialog = false,
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
      // A gadget that opens an OS file dialog carries no native tooltip while
      // it can be clicked. The picker takes the cursor off-page with the
      // tooltip already up, so the browser never gets the mouseleave that would
      // dismiss it and goes on painting it over whatever appears next — usually
      // the requester the chosen file just opened, where it sits until clicked
      // away. Three goes at clearing the attribute at the right instant (a
      // frame later, on mouseleave, on mousemove) each failed, because by then
      // the tooltip is already on screen and out of the page's hands.
      //
      // The visible label and the drawer head above it already say what these
      // do, and aria-label keeps the full text for a screen reader. A disabled
      // one keeps its tooltip: it cannot be clicked, so nothing can strand it,
      // and its title is the only place that says why it is dim.
      title={opensFileDialog && !disabled ? undefined : title}
      aria-label={title}
      onClick={(event): void => {
        // Most gadgets close the menu, so the button unmounts with the pointer
        // still on it. A native tooltip is not tied to DOM lifecycle and would
        // stay painted over the canvas, so clear the attribute while the
        // browser can still be told to drop it. (The file gadgets carry no
        // title at all — see the render above for why that case is beyond
        // rescuing.)
        //
        // Restored only once the pointer really moves over this button again,
        // not on a timer or on mouseleave: while it sits still there is nothing
        // to show a tooltip for, and putting the title back under a parked
        // cursor is what arms the next one.
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
        // Side by side the keycap is a third item in the button's own flex
        // row, taking its gap from there; stacked it needs the labelrow to sit
        // beside the label rather than under the icon.
        <>
          {label && <span className="wb-gadget__label">{label}</span>}
          {shortcut && <kbd className="wb-gadget__keycap">{shortcut}</kbd>}
        </>
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
