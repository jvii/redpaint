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
  // label, stacked gadgets only — see docs/style-guide.md's "Text on
  // controls" section). Omit for gadgets with no hotkey (Bend H/V).
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
        // Gadgets like Open/Save image synchronously trigger a native OS
        // file dialog that steals the cursor before the button unmounts
        // (the menu closes on mouseleave once the cursor leaves the page —
        // see MenuGadgets.tsx's useFileOpener comment). The browser's native
        // title-attribute tooltip isn't tied to DOM lifecycle, so it stays
        // painted over the canvas until the next real mouse move. Clearing
        // (and restoring) the attribute forces it to hide immediately.
        const button = event.currentTarget;
        button.removeAttribute('title');
        onClick?.();
        requestAnimationFrame(() => button.setAttribute('title', title));
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

// A hidden file input decoupled from its trigger button's own mount
// lifetime. The button lives inside the menu's collapsible content (unmounted
// while the menu is closed, by design — see Menu.tsx's own comment on that),
// but opening the OS file picker moves the mouse cursor off-page into a
// separate native window, which fires a real mouseleave on .menu and closes
// it (and unmounts the collapsible content) *while the OS dialog is still
// open*. If the <input> lived in that content, React would tear it down
// mid-flight, and the 'change' event the OS dialog fires on file selection
// would have nowhere to land — file picked, nothing happens, no error either
// (confirmed via CDP: this never reproduces under automation, since nothing
// simulates the cursor actually leaving the page for a native window).
// The caller renders `input` somewhere that survives that close — e.g.
// directly under the top-level .menu div, a sibling of the collapsible
// content rather than inside it — and wires a plain button's onClick to `open`.
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
