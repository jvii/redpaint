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
      // No native tooltip on a gadget that opens an OS file dialog: the picker
      // takes the cursor off-page with the tooltip up, so the browser never
      // gets the mouseleave that dismisses it and paints it over the requester
      // that follows. Once shown it is beyond the page's reach, so it has to
      // be the attribute that is withheld. A disabled one keeps its title —
      // nothing can strand it, and it is the only thing saying why it is dim.
      title={opensFileDialog && !disabled ? undefined : title}
      aria-label={title}
      onClick={(event): void => {
        // Most gadgets close the menu, unmounting the button under the
        // pointer; a native tooltip outlives the DOM node and would stay
        // painted over the canvas. Restored on a real mousemove rather than a
        // timer — putting the title back under a parked cursor arms the next
        // one.
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

// The caller must render `input` somewhere that outlives the menu's
// collapsible content. Opening the picker moves the cursor off-page, which
// closes the menu; an <input> inside it is torn down mid-flight and the
// 'change' event lands nowhere — file picked, nothing happens, no error. Does
// not reproduce under CDP, which cannot move the cursor into a native window.
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
