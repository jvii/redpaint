import React, { JSX, ReactNode, useRef } from 'react';
import './Menubar.css';

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
};

export function Gadget({
  icon,
  label,
  title,
  onClick,
  disabled = false,
  on = false,
}: GadgetProps): JSX.Element {
  return (
    <button
      className={'wb-gadget' + (on ? ' wb-gadget--on' : '')}
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {label && <span className="wb-gadget__label">{label}</span>}
    </button>
  );
}

// A gadget fronting a hidden file input (same contract as the old
// MenuItemOpen: image filter, value reset so re-opening the same file fires).
export function GadgetOpen(
  props: Omit<GadgetProps, 'onClick'> & { handleFile: (input: HTMLInputElement) => void }
): JSX.Element {
  const { handleFile, ...gadgetProps } = props;
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Gadget {...gadgetProps} onClick={(): void => fileInputRef.current?.click()} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(event): void => {
          handleFile(event.target);
          event.target.value = '';
        }}
        style={{ display: 'none' }}
      />
    </>
  );
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
